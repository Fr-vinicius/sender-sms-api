import { SMS_CONCURRENCY, BATCH_SIZE } from "../config/env.js";
import {
  getCampaign,
  getContactsBatch,
  markContactsForwarded,
  updateContactsStatusBatch,
  insertSmsLink,
  insertShortenedLinkParameters,
} from "../repositories/contactsRepository.js";
import { buildMessage, generateSlug } from "../utils/helpers.js";
import { Semaphore } from "../utils/semaphore.js";
import { pushRedisWebhook } from "./webhookService.js";
import { sendSms } from "./smsService.js";
import { pool } from "../config/db.js";
import {
  insertSmsLog,
  isCampaignCancelled,
} from "../repositories/campaignRepository.js";

export async function processCampaignJob(job) {
  const { campaign_id, dominio, store_id } = job.data || job;

  await insertSmsLog(store_id, campaign_id, "START", "Disparo iniciado");

  console.log(
    `🚀 [processCampaignJob] Iniciando campanha ${campaign_id} | store=${store_id}, dominio=${dominio}`
  );

  if (!campaign_id || !dominio || !store_id) {
    await insertSmsLog(
      store_id,
      campaign_id,
      "ERROR",
      "Dados obrigatórios ausentes"
    );
    throw new Error("Missing fields (campaign_id, dominio, store_id)");
  }

  const campaign = await getCampaign(campaign_id);
  if (!campaign) {
    await insertSmsLog(
      store_id,
      campaign_id,
      "ERROR",
      "Campanha não encontrada"
    );
    throw new Error("Campanha não encontrada");
  }

  console.log(
    `📝 [processCampaignJob] Template carregado: "${campaign.message_template}" | URL final: ${campaign.final_url}`
  );

  let offset = 0;
  let totalProcessed = 0;
  let totalOk = 0;
  let totalFail = 0;
  let batchIndex = 0;

  try {
    while (true) {
      if (await isCampaignCancelled(campaign_id)) {
        await insertSmsLog(
          store_id,
          campaign_id,
          "CANCELLED",
          `Disparo cancelado no lote ${batchIndex}. Processados: ${totalProcessed}, Enviados: ${totalOk}`
        );
        console.warn(
          `🛑 [processCampaignJob] Campanha ${campaign_id} cancelada!`
        );
        return {
          success: false,
          cancelled: true,
          processed: totalProcessed,
          sent: totalOk,
          failed: totalFail,
        };
      }

      const contacts = await getContactsBatch(campaign_id, BATCH_SIZE, offset);
      if (!contacts || contacts.length === 0) {
        console.log(
          "📭 [processCampaignJob] Nenhum contato encontrado, encerrando loop."
        );
        break;
      }

      batchIndex++;
      await insertSmsLog(
        store_id,
        campaign_id,
        "BATCH_START",
        `Iniciando lote ${batchIndex} com ${contacts.length} contatos`
      );

      console.log(
        `📦 [processCampaignJob] Lote ${batchIndex} -> ${contacts.length} contatos`
      );

      const nowIso = new Date().toISOString();

      const items = contacts.map((c) => {
        const slug = generateSlug();
        const shortUrl = `${dominio}/${slug}`;
        return {
          contact_id: c.id,
          phone: c.phone,
          store_id,
          destination_url: campaign.final_url,
          slug,
          shortUrl,
          created_at: nowIso,
          parameterized_url: `${c.id}${c.sequence_number}`,
        };
      });

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await insertSmsLink(
          client,
          items.map((it) => [
            it.store_id,
            campaign_id,
            it.contact_id,
            "SMS",
            it.destination_url,
            it.shortUrl,
            it.created_at,
            it.parameterized_url,
          ])
        );

        await insertShortenedLinkParameters(
          client,
          items.map((it) => [
            it.store_id,
            it.destination_url,
            it.slug,
            it.shortUrl,
            it.parameterized_url,
          ])
        );

        await markContactsForwarded(
          client,
          items.map((it) => it.contact_id)
        );

        await client.query("COMMIT");
      } catch (e) {
        await client.query("ROLLBACK");
        await insertSmsLog(
          store_id,
          campaign_id,
          "ERROR",
          `Erro DB no lote ${batchIndex}: ${e.message}`
        );
        throw e;
      } finally {
        client.release();
      }

      // === Envio Webhook ===
      try {
        const payload = items.map((it) => ({
          id: it.parameterized_url,
          store_id: it.store_id,
          link: it.destination_url,
          slug: it.slug,
        }));
        await pushRedisWebhook(payload);
      } catch (e) {
        await insertSmsLog(
          store_id,
          campaign_id,
          "ERROR",
          `Erro webhook no lote ${batchIndex}: ${e.message}`
        );
      }

      // === Envio SMS ===
      const sem = new Semaphore(SMS_CONCURRENCY);
      const statusUpdates = [];

      await Promise.all(
        items.map(async (it) => {
          await sem.acquire();
          try {
            const msg = buildMessage(campaign.message_template, it.shortUrl);
            const result = await sendSms(it.phone, msg);
            const statusDesc = (result && result.statusDescription) || "Error";
            const isOk = /^ok|sent|accepted$/i.test(statusDesc);

            statusUpdates.push({
              contact_id: it.contact_id,
              isOk,
              partId: result?.partId || null,
            });
          } catch (e) {
            statusUpdates.push({
              contact_id: it.contact_id,
              isOk: false,
              partId: null,
            });
          } finally {
            sem.release();
          }
        })
      );

      const okUpdates = statusUpdates.filter((s) => s.isOk);
      const failUpdates = statusUpdates.filter((s) => !s.isOk);

      const client2 = await pool.connect();
      try {
        await client2.query("BEGIN");

        for (const upd of okUpdates) {
          await updateContactsStatusBatch(
            client2,
            [upd.contact_id],
            true,
            "Sent",
            upd.partId
          );
        }
        for (const upd of failUpdates) {
          await updateContactsStatusBatch(
            client2,
            [upd.contact_id],
            false,
            "Not Sent",
            upd.partId
          );
        }

        await client2.query("COMMIT");
      } catch (e) {
        await client2.query("ROLLBACK");
        await insertSmsLog(
          store_id,
          campaign_id,
          "ERROR",
          `Erro atualização status no lote ${batchIndex}: ${e.message}`
        );
        throw e;
      } finally {
        client2.release();
      }

      totalProcessed += items.length;
      totalOk += okUpdates.length;
      totalFail += failUpdates.length;
      offset += BATCH_SIZE;

      await insertSmsLog(
        store_id,
        campaign_id,
        "BATCH_END",
        `Lote ${batchIndex} Finalizado. Enviados: ${okUpdates.length}, FALHA: ${failUpdates.length}`
      );

      if (job.updateProgress) {
        await job.updateProgress({
          batchIndex,
          totalProcessed,
          totalOk,
          totalFail,
        });
      }
    }

    await insertSmsLog(
      store_id,
      campaign_id,
      "END",
      `Disparo finalizado. Processados: ${totalProcessed}, Enviados: ${totalOk}, FALHA: ${totalFail}`
    );

    return {
      success: true,
      processed: totalProcessed,
      sent: totalOk,
      failed: totalFail,
    };
  } catch (err) {
    await insertSmsLog(
      store_id,
      campaign_id,
      "ERROR",
      `Erro fatal: ${err.message}`
    );
    throw err;
  }
}

import { enqueueCampaign, smsQueue } from "../queue/bullmq.js";
import {
  isCampaignCancelled,
  markCampaignAsCancelled,
} from "../repositories/campaignRepository.js";

export default async function routes(fastify) {
  // Inicia uma campanha
  fastify.post("/process-campaign", async (req, reply) => {
    const { campaign_id, dominio, store_id } = req.body || {};
    if (!campaign_id || !dominio || !store_id) {
      return reply.status(400).send({ error: "Parâmetros inválidos" });
    }
    try {
      const job = await enqueueCampaign({ campaign_id, dominio, store_id });
      return reply.status(202).send({
        accepted: true,
        jobId: job.id,
        campaign_id,
        message: "Fila criada.",
      });
    } catch (e) {
      req.log.error(e, "Erro ao enfileirar campanha");
      return reply.status(500).send({ error: "Falha ao enfileirar campanha" });
    }
  });

  // Consulta status de um job
  fastify.get("/campaign-status/:jobId", async (req, reply) => {
    const job = await smsQueue.getJob(req.params.jobId);
    if (!job) return reply.status(404).send({ error: "Job não encontrado" });

    const state = await job.getState();
    const progress = job.progress;
    let returnValue = null;

    function formatTimestamp(ts) {
      const d = new Date(ts);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      const hh = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      const ss = String(d.getSeconds()).padStart(2, "0");
      return `${dd}/${mm}/${yyyy}-${hh}:${mi}:${ss}`;
    }

    try {
      returnValue = await job.getReturnValue();
    } catch {}

    if (await isCampaignCancelled(job.id)) {
      return {
        jobId: job.id,
        success: false,
        cancelled: true,
        progress,
        finishedOn: formatTimestamp(job.finishedOn),
      };
    } else {
      return reply.send({
        jobId: job.id,
        state,
        progress,
        returnValue,
        attemptsMade: job.attemptsMade,
        failedReason: job.failedReason,
        finishedOn: formatTimestamp(job.finishedOn),
      });
    }
  });

  // Cancela campanha
  fastify.post("/cancel-campaign/:campaignId", async (req, reply) => {
    const { campaignId } = req.params;
    await markCampaignAsCancelled(campaignId);

    try {
      const job = await smsQueue.getJob(campaignId);
      if (job && (await job.getState()) === "waiting") {
        await job.remove();
      }
    } catch (err) {
      req.log.error(err, "Erro ao tentar remover job da fila");
    }

    return reply.send({ cancelled: true, campaign_id: campaignId });
  });
}

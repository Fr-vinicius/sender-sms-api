import { Worker } from "bullmq";
import { connection, QUEUE_NAME } from "../queue/bullmq.js";
import { processCampaignJob } from "../services/campaignProcessor.js";

const concurrency = Number(process.env.WORKER_CONCURRENCY || 1);

const worker = new Worker(
  QUEUE_NAME,
  async (job) => {
    console.log(
      `📥 [Worker] Novo job recebido -> ID: ${job.id}, Name: ${job.name}`
    );
    console.log(`📦 [Worker] Payload:`, job.data);

    try {
      const result = await processCampaignJob(job);

      console.log(
        `📤 [Worker] Job ${job.id} finalizado com resultado:`,
        result
      );
      return result || { success: true };
    } catch (err) {
      console.error(
        `💥 [Worker] Erro fatal no job ${job.id}:`,
        err?.message || err
      );
      console.error("Stack:", err?.stack);
      console.error("Payload problemático:", job.data);
      throw err;
    }
  },
  { connection, concurrency }
);

// Eventos globais
worker.on("completed", (job, result) => {
  console.log(`✅ [Worker] Job ${job.id} marcado como completed`, result);
});

worker.on("failed", (job, err) => {
  console.error(`❌ [Worker] Job ${job?.id} falhou:`, err?.message || err);
});

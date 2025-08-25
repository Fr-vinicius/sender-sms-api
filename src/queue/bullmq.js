// src/queue/bullmq.js
import pkg from "bullmq";
import IORedis from "ioredis";

const { Queue } = pkg;

export const REDIS_HOST = "137.184.16.40";
export const REDIS_PORT = 6379;
export const QUEUE_NAME = "sms-campaign";

export const connection = new IORedis({
  host: REDIS_HOST,
  port: REDIS_PORT,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

// Fila principal
export const smsQueue = new Queue(QUEUE_NAME, { connection });

// Função para adicionar campanhas
export async function enqueueCampaign({ campaign_id, store_id, dominio }) {
  if (!campaign_id || !store_id || !dominio) {
    throw new Error(
      `enqueueCampaign chamado com parâmetros inválidos: ${JSON.stringify({
        campaign_id,
        store_id,
        dominio,
      })}`
    );
  }

  console.log("📥 [Queue] Enfileirando campanha:", {
    campaign_id,
    store_id,
    dominio,
  });

  return smsQueue.add(
    "processCampaign",
    { campaign_id, store_id, dominio },
    {
      jobId: campaign_id,
      removeOnComplete: { age: 3600, count: 1000 },
      removeOnFail: { age: 86400, count: 500 },
      attempts: Number(process.env.JOB_ATTEMPTS || 1),
      backoff: { type: "exponential", delay: 2000 },
    }
  );
}

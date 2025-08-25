import { connection } from "../queue/bullmq.js";

// Marca campanha como cancelada
export async function markCampaignAsCancelled(campaignId) {
  await connection.set(
    `campaign:${campaignId}:cancelled`,
    "1",
    "EX",
    60 * 60 * 24 * 3
  );
}

// Verifica se a campanha foi cancelada
export async function isCampaignCancelled(campaignId) {
  const v = await connection.get(`campaign:${campaignId}:cancelled`);
  return v === "1";
}

import { pool } from "../config/db.js";

export async function insertSmsLog(store_id, campaign_id, type, description) {
  const sql = `
    INSERT INTO sms_logs (store_id, campaign_id, type, description)
    VALUES ($1, $2, $3, $4)
  `;
  return pool.query(sql, [store_id, campaign_id, type, description]);
}

import { pool } from "../config/db.js";
import { buildMultiInsert } from "../utils/multiInsert.js";

export async function getCampaign(campaign_id) {
  const { rows } = await pool.query(
    "SELECT message_template, final_url FROM sms_campaign WHERE id = $1",
    [campaign_id]
  );
  return rows[0];
}

export async function getContactsBatch(campaign_id, limit, offset) {
  const { rows } = await pool.query(
    `SELECT id, name, phone, sequence_number
     FROM sms_contact
     WHERE campaign_id = $1
     ORDER BY id ASC
     LIMIT $2 OFFSET $3`,
    [campaign_id, limit, offset]
  );
  return rows;
}

export async function markContactsForwarded(client, ids) {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const sql = `UPDATE sms_contact SET forwarded_to_zenvia = true WHERE id IN (${placeholders})`;
  return client.query(sql, ids);
}

export async function updateContactStatus(
  client,
  contact_id,
  messageSent,
  status
) {
  const sql = `UPDATE sms_contact SET message_sent = $1, message_status = $2 WHERE id = $3`;
  return client.query(sql, [messageSent, status, contact_id]);
}

export async function insertSmsLink(client, rows) {
  const cols = [
    "store_id",
    "campaign_id",
    "contact_id",
    "channel",
    "original_url",
    "shortlink_url",
    "created_at",
    "parameterized_url",
  ];
  const { sql, params } = buildMultiInsert("sms_link", cols, rows);
  return client.query(sql, params);
}

export async function insertShortenedLinkParameters(client, rows) {
  const cols = ["store_id", "link", "slug", "shortened_link", "id"];
  const { sql, params } = buildMultiInsert(
    "shortened_link_parameters",
    cols,
    rows
  );

  return client.query(sql, params);
}

export async function updateContactsStatusBatch(
  client,
  ids,
  messageSent,
  status,
  messageId
) {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  const sql = `UPDATE sms_contact 
               SET message_sent = $${ids.length + 1}, 
                   message_status = $${ids.length + 2}, 
                   message_id = $${ids.length + 3}
               WHERE id IN (${placeholders})`;
  return client.query(sql, [...ids, messageSent, status, messageId]);
}

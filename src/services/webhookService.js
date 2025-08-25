import fetch from "node-fetch";
import { WEBHOOK_URL } from "../config/env.js";

export async function pushRedisWebhook(payload) {
  // payload: array of { id, store_id, link, slug }
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`Webhook HTTP ${res.status} ${txt}`);
    }
    return true;
  } catch (e) {
    throw e;
  }
}

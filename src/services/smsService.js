import fetch from "node-fetch";
import {
  CALLBACK_URL,
  SMS_RETRIES,
  SINCH_AUTH,
  SINCH_URL,
  SINCH_NUMBER,
} from "../config/env.js";
import { withRetries } from "../utils/withRetries.js";

export async function sendSms(phone, msg) {
  const payload = {
    from: SINCH_NUMBER,
    to: [phone],
    body: msg,
    type: "mt_text",
    delivery_report: "per_recipient_final",
    callback_url: CALLBACK_URL,
  };

  console.log("[sendSms] Payload:", JSON.stringify(payload, null, 2));

  const fn = async () => {
    let res;
    try {
      res = await fetch(SINCH_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${SINCH_AUTH}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new Error(
        `[FetchError] Falha ao enviar para Sinch: ${err.message}`
      );
    }

    const text = await res.text();
    console.log(`[Sinch Raw] ${phone} (status ${res.status}):`, text);

    if (!res.ok) {
      throw new Error(`[HTTPError] ${res.status}: ${text}`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`[ParseError] Resposta não-JSON da Sinch: ${text}`);
    }

    if (!json.id) {
      throw new Error(`[InvalidResponse] Sem ID retornado: ${text}`);
    }

    console.log("[sendSms] Parsed JSON:", JSON.stringify(json, null, 2));

    return {
      messageId: json.id,
      statusDescription: "accepted",
    };
  };

  try {
    return await withRetries(fn, SMS_RETRIES, 400);
  } catch (e) {
    console.error(`[sendSms] Falha para ${phone}:`, e.message);
    return {
      statusDescription: "Error",
      error: e.message || "Erro desconhecido",
    };
  }
}

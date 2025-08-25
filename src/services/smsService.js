import fetch from "node-fetch";
import {
  ZENVIA_URL,
  ZENVIA_AUTH,
  CALLBACK_URL,
  SMS_RETRIES,
} from "../config/env.js";
import { withRetries } from "../utils/withRetries.js";

export async function sendSms(phone, msg) {
  const payload = {
    sendSmsRequest: {
      from: "",
      to: phone,
      msg,
      callbackOption: "FINAL",
      callbackUrl: CALLBACK_URL,
    },
  };

  console.log("[sendSms] Payload preparado:", JSON.stringify(payload, null, 2));

  const fn = async () => {
    let res;
    try {
      res = await fetch(ZENVIA_URL, {
        method: "POST",
        headers: {
          Authorization: ZENVIA_AUTH,
          "Content-Type": "application/json",
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      throw new Error(
        `[FetchError] Falha ao enviar para Zenvia: ${err.message}`
      );
    }

    const text = await res.text();
    console.log(`[Zenvia Raw] ${phone} (status ${res.status}):`, text);

    if (!res.ok) {
      throw new Error(`[HTTPError] ${res.status}: ${text}`);
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`[ParseError] Resposta não-JSON da Zenvia: ${text}`);
    }

    const send = json?.sendSmsResponse || json?.sendSmsResponses?.[0];
    if (!send) {
      throw new Error(
        `[InvalidResponse] Resposta inesperada da Zenvia: ${text}`
      );
    }

    console.log("[sendSms] Parsed JSON:", JSON.stringify(send, null, 2));

    const statusDesc = send.statusDescription || "";
    const partId = send.parts?.[0]?.partId ?? null;
    console.log(`[Zenvia] ${phone} status: ${statusDesc}, partId: ${partId}`);

    return { statusDescription: statusDesc, partId };
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

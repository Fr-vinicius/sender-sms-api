import fetch from "node-fetch";
import {
  HEALTH_CHECK_TO,
  SINCH_AUTH,
  SINCH_NUMBER,
  SINCH_URL,
} from "../config/env.js";

let lastSmsSent = 0;
const SMS_INTERVAL_MS = 60 * 1000;

export default async function (fastify) {
  fastify.get("/health", async () => {
    const now = Date.now();

    if (now - lastSmsSent >= SMS_INTERVAL_MS) {
      lastSmsSent = now;

      try {
        const res = await fetch(SINCH_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SINCH_AUTH}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: SINCH_NUMBER,
            to: [HEALTH_CHECK_TO],
            body: "health ckeck ok",
            type: "mt_text",
            delivery_report: "none",
          }),
        });

        const text = await res.text();
        console.log("Resposta sinch (raw):", res.status, text);

        if (!res.ok) {
          throw new Error(`[SinchError] ${res.status}: ${text}`);
        }

        let json;
        try {
          json = JSON.parse(text);
          console.log("Resposta sinch (JSON):", json);
        } catch {
          console.error("⚠️ Resposta não era JSON válido:", text);
        }
      } catch (err) {
        console.error("Erro ao enviar SMS:", err.message);
      }
    } else {
      console.log("SMS ignorado - limite de 1 por minuto.");
    }

    return { healthy: true };
  });
}

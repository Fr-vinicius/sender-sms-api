import fetch from "node-fetch";
import { ZENVIA_AUTH } from "../config/env.js";

let lastSmsSent = 0;
const SMS_INTERVAL_MS = 60 * 1000;

export default async function (fastify) {
  fastify.get("/health", async () => {
    const now = Date.now();

    if (now - lastSmsSent >= SMS_INTERVAL_MS) {
      lastSmsSent = now;

      try {
        const res = await fetch(
          "https://api-rest.zenvia.com/services/send-sms",
          {
            method: "POST",
            headers: {
              Authorization: ZENVIA_AUTH,
              "Content-Type": "application/json",
              Accept: "application/json",
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({
              sendSmsRequest: {
                from: "",
                to: "5512991725478",
                msg: "Health check disparado",
              },
            }),
          }
        );

        const json = await res.json();
        console.log("Resposta Zenvia:", json);
      } catch (err) {
        console.error("Erro ao enviar SMS:", err.message);
      }
    } else {
      console.log("SMS ignorado - limite de 1 por minuto.");
    }

    return { healthy: true };
  });
}

import fastify from "./app.js";
import { PORT } from "./config/env.js";
import "dotenv/config";

fastify
  .listen({ port: PORT, host: "0.0.0.0" })
  .then(() => fastify.log.info(`API running on :${PORT}`))
  .catch((e) => {
    fastify.log.error(e);
    process.exit(1);
  });

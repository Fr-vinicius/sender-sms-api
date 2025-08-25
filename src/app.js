import Fastify from "fastify";
import smsRoutes from "./routes/smsRoutes.async.js";
import healthRoutes from "./routes/healthRoutes.js";

const fastify = Fastify({ logger: true });

fastify.register(smsRoutes);
fastify.register(healthRoutes);

export default fastify;

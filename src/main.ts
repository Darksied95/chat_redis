import dotenv from "dotenv";
import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyIO from "fastify-socket.io";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3001");
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.HOST || "http://localhost:3000";
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;

if (!UPSTASH_REDIS_REST_URL) {
  console.log("missing UPSTASH_REDIS_REST_URL ");
  process.exit(1);
}

async function buildServer() {
  const app = fastify();

  app.get("/healthcheck", () => {
    return {
      status: "ok",
      port: PORT,
    };
  });

  return app;
}

async function main() {
  const app = await buildServer();

  try {
    await app.listen({
      port: PORT,
      host: HOST,
    });
    console.log(`Server Started  at  http://${HOST}:${PORT}`);
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

main();

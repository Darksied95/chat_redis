import dotenv from "dotenv";
import fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyIO from "fastify-socket.io";
import Redis from "ioredis";

dotenv.config();

const PORT = parseInt(process.env.PORT || "3001");
const HOST = process.env.HOST || "0.0.0.0";
const CORS_ORIGIN = process.env.HOST || "http://localhost:3000";
const UPSTASH_REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;

const CONNECTION_COUNT_CHANNEL = "chat:connection-count";

if (!UPSTASH_REDIS_REST_URL) {
  console.log("missing UPSTASH_REDIS_REST_URL ");
  process.exit(1);
}
const publisher = new Redis(UPSTASH_REDIS_REST_URL);
const subscriber = new Redis(UPSTASH_REDIS_REST_URL);

const currentCount = publisher.get(CONNECTION_COUNT_CHANNEL);

if (!currentCount) {
  publisher.set(CONNECTION_COUNT_CHANNEL, 0);
}

async function buildServer() {
  const app = fastify();

  await app.register(fastifyCors, {
    origin: CORS_ORIGIN,
  });

  await app.register(fastifyIO);

  app.io.on("connection", async (io) => {
    console.log("Client connected");
    await publisher.incr(CONNECTION_COUNT_CHANNEL);

    io.on("disconnect", async () => {
      console.log("disconnected");
      await publisher.decr(CONNECTION_COUNT_CHANNEL);
    });
  });

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

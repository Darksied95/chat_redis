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

const CONNECTION_COUNT_KEY = "chat:connection-count";
const CONNECTION_COUNT_UPDATED_CHANNEL = "chat:connection-count-updated";

if (!UPSTASH_REDIS_REST_URL) {
  console.log("missing UPSTASH_REDIS_REST_URL ");
  process.exit(1);
}
const publisher = new Redis(UPSTASH_REDIS_REST_URL);
const subscriber = new Redis(UPSTASH_REDIS_REST_URL);

const currentCount = publisher.get(CONNECTION_COUNT_KEY);

if (!currentCount) {
  publisher.set(CONNECTION_COUNT_KEY, 0);
}

async function buildServer() {
  const app = fastify();

  await app.register(fastifyCors, {
    origin: CORS_ORIGIN,
  });

  await app.register(fastifyIO);

  app.io.on("connection", async (io) => {
    console.log("Client connected");
    const incCount = await publisher.incr(CONNECTION_COUNT_KEY);

    //so our subscribers (browser) can see the newCOunt value
    await publisher.publish(CONNECTION_COUNT_UPDATED_CHANNEL, String(incCount));

    io.on("disconnect", async () => {
      console.log("disconnected");
      const descCount = await publisher.decr(CONNECTION_COUNT_KEY);
      await publisher.publish(
        CONNECTION_COUNT_UPDATED_CHANNEL,
        String(descCount)
      );
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

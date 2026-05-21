import express from "express";
import { payhipWebhookRouter } from "./routes/payhipWebhook.routes.js";
import { logger } from "./services/logging.service.js";

export const app = express();

app.use(express.json({ limit: "1mb" }));

app.use((request, response, next) => {
  const startedAt = process.hrtime.bigint();

  response.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

    logger.info("HTTP request completed", {
      method: request.method,
      path: request.path,
      statusCode: response.statusCode,
      durationMs: Math.round(durationMs),
    });
  });

  next();
});

app.get("/health", (_request, response) => {
  response.status(200).json({ status: "ok" });
});

app.use(payhipWebhookRouter);
export default app

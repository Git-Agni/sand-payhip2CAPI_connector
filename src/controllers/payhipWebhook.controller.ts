import type { Request, Response } from "express";
import { timingSafeEqual } from "node:crypto";
import { config } from "../config/env.js";
import { validatePayhipPaidWebhook } from "../schemas/payhip.schema.js";
import { MetaCapiService } from "../services/metaCapi.service.js";
import { logger } from "../services/logging.service.js";
import { sha256Raw } from "../utils/hash.js";

const metaCapiService = new MetaCapiService();

const hasValidPayhipSignature = (signature: unknown): boolean => {
  if (!config.payhip.apiKey) {
    return true;
  }

  if (typeof signature !== "string") {
    return false;
  }

  const expectedSignature = sha256Raw(config.payhip.apiKey);
  const expected = Buffer.from(expectedSignature, "hex");
  const actual = Buffer.from(signature, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
};

export const handlePayhipWebhook = async (request: Request, response: Response): Promise<void> => {

  if (!hasValidPayhipSignature(request.body?.signature)) {
    logger.warn("Rejected Payhip webhook with invalid signature");
    response.status(401).json({ error: "invalid_payhip_signature" });
    return;
  }

  if (request.body?.type !== "paid") {
    logger.info("Ignored unsupported Payhip webhook event", {
      eventType: typeof request.body?.type === "string" ? request.body.type : "unknown",
    });
    response.status(200).json({ status: "ignored", reason: "unsupported_event_type" });
    return;
  }

  const validation = validatePayhipPaidWebhook(request.body);

  if (!validation.success || !validation.data) {
    logger.warn("Rejected invalid Payhip paid webhook payload", {
      errors: validation.errors ?? [],
    });
    response.status(400).json({ error: "invalid_payhip_payload", details: validation.errors ?? [] });
    return;
  }

  try {
    logger.info("Processing Payhip paid webhook", {
      payhipTransactionId: validation.data.id,
      itemCount: validation.data.items.length,
      currency: validation.data.currency,
      value: validation.data.price / 100,
    });

    const metaResponse = await metaCapiService.sendPurchaseFromPayhip(validation.data);

    logger.info("Payhip webhook forwarded to Meta CAPI", {
      payhipTransactionId: validation.data.id,
      eventsReceived: metaResponse.events_received,
      fbtraceId: metaResponse.fbtrace_id,
    });

    response.status(200).json({
      status: "ok",
      payhipTransactionId: validation.data.id,
      meta: metaResponse,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Meta CAPI error";
    logger.error("Failed to forward Payhip webhook to Meta CAPI", error, {
      payhipTransactionId: validation.data.id,
    });
    response.status(502).json({ error: "meta_capi_failed", message });
  }
};

import type { Request, Response } from "express";
import { validatePayhipPaidWebhook } from "../schemas/payhip.schema.js";
import { MetaCapiService } from "../services/metaCapi.service.js";
import { logger } from "../services/logging.service.js";

const metaCapiService = new MetaCapiService();


export const handlePayhipWebhook = async (request: Request, response: Response): Promise<void> => {


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

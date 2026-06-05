import { config } from '../config/env.js';
import type { PayhipPaidWebhook } from '../models/payhip.models.js';
import type {
  MetaEventsRequest,
  MetaEventsResponse,
  MetaPurchaseEvent,
} from '../models/meta.models.js';
import { sha256Normalized } from '../utils/hash.js';
import { logger } from './logging.service.js';

export type MetaCapiService = ReturnType<typeof makeMetaCapiService>

export function makeMetaCapiService() {
  async function sendPurchaseFromPayhip(
    payload: PayhipPaidWebhook,
  ): Promise<MetaEventsResponse> {
    const event = toPurchaseEvent(payload);
    const requestBody: MetaEventsRequest = {
      data: [event],
      ...(config.meta.testEventCode
        ? { test_event_code: config.meta.testEventCode }
        : {}),
    };

    logger.debug('Sending Meta CAPI purchase event', {
      eventId: event.event_id,
      graphApiVersion: config.meta.graphApiVersion,
      testMode: Boolean(config.meta.testEventCode),
    });

    const response = await fetch(eventsUrl(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const responseBody = (await response.json()) as
      | MetaEventsResponse
      | { error?: unknown };

    if (!response.ok) {
      logger.warn('Meta CAPI purchase event rejected', {
        eventId: event.event_id,
        statusCode: response.status,
        response: responseBody,
      });
      throw new Error(
        `Meta CAPI request failed: ${JSON.stringify(responseBody)}`,
      );
    }

    const metaResponse = responseBody as MetaEventsResponse;

    logger.debug('Meta CAPI purchase event accepted', {
      eventId: event.event_id,
      eventsReceived: metaResponse.events_received,
      fbtraceId: metaResponse.fbtrace_id,
    });

    return metaResponse;
  }

  function toPurchaseEvent(payload: PayhipPaidWebhook): MetaPurchaseEvent {
    const contentIds = payload.items.map((item) => item.product_id);

    return {
      event_name: 'Purchase',
      event_time: payload.date,
      event_id: payload.id,
      action_source: 'website',
      ...(config.meta.eventSourceUrl
        ? { event_source_url: config.meta.eventSourceUrl }
        : {}),
      user_data: {
        em: [sha256Normalized(payload.email)],
        client_ip_address: payload.ip_address,
      },
      custom_data: {
        currency: payload.currency.toUpperCase(),
        value: payload.price / 100,
        order_id: payload.id,
        content_type: 'product',
        content_ids: contentIds,
        contents: payload.items.map((item) => ({
          id: item.product_id,
          quantity: Number.parseInt(item.quantity, 10) || 1,
          title: item.product_name,
        })),
      },
    };
  }

  function eventsUrl(): string {
    const params = new URLSearchParams({
      access_token: config.meta.accessToken,
    });
    return `https://graph.facebook.com/${config.meta.graphApiVersion}/${config.meta.pixelId}/events?${params.toString()}`;
  }

  return {
    sendPurchaseFromPayhip,
  };
}

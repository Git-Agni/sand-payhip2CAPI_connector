import "dotenv/config";
export interface AppConfig {
  readonly port: number;
  readonly mongoDbUrl: string;
  readonly meta: {
    readonly graphApiVersion: string;
    readonly pixelId: string;
    readonly accessToken: string;
    readonly testEventCode?: string;
    readonly eventSourceUrl?: string;
  };
  readonly payhip: {
    readonly apiKey?: string;
    readonly webhookToken?: string;
  };
  readonly customerio: {
    readonly apiSecret: string
  }
}

const getRequiredEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const getOptionalEnv = (name: string): string | undefined => {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
};

const parsePort = (value: string | undefined): number => {
  if (!value) {
    return 8000;
  }

  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error("PORT must be a positive integer");
  }

  return port;
};

const metaTestEventCode = getOptionalEnv("META_TEST_EVENT_CODE");
const metaEventSourceUrl = getOptionalEnv("META_EVENT_SOURCE_URL");
const payhipApiKey = getOptionalEnv("PAYHIP_API_KEY");
const payhipWebhookToken = getOptionalEnv("PAYHIP_WEBHOOK_TOKEN");
const mongoDbUrl = getOptionalEnv("MONGO_DB_URL") ?? "mongodb://localhost:27017/payhip-capi-attribution";

const metaConfig: AppConfig["meta"] = {
  graphApiVersion: getOptionalEnv("META_GRAPH_API_VERSION") ?? "v25.0",
  pixelId: getRequiredEnv("META_PIXEL_ID"),
  accessToken: getRequiredEnv("META_ACCESS_TOKEN"),
  ...(metaTestEventCode ? { testEventCode: metaTestEventCode } : {}),
  ...(metaEventSourceUrl ? { eventSourceUrl: metaEventSourceUrl } : {}),
};

const payhipConfig: AppConfig["payhip"] = {
  ...(payhipApiKey ? { apiKey: payhipApiKey } : {}),
  ...(payhipWebhookToken ? { webhookToken: payhipWebhookToken } : {}),
};

const customerioConfig: AppConfig["customerio"] = {
  apiSecret: getRequiredEnv("CUSTOMERIO_API_SECRET")
}
export const config: AppConfig = {
  port: parsePort(process.env.PORT),
  mongoDbUrl,
  meta: metaConfig,
  payhip: payhipConfig,
  customerio: customerioConfig
};

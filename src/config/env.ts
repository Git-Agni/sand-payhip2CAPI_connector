import 'dotenv/config';
export interface AppConfig {
  readonly port: number;
  readonly mongoDbUrl: string;
  readonly meta: {
    readonly graphApiVersion: string;
    readonly pixelId: string;
    readonly accessToken: string;
    readonly adAccountId?: string;
    readonly marketingAccessToken: string;
    readonly testEventCode?: string;
    readonly eventSourceUrl?: string;
  };
  readonly payhip: {
    readonly apiKey?: string;
    readonly webhookToken?: string;
  };
  readonly customerio: {
    readonly apiSecret: string;
  };
  readonly cron: {
    readonly secret?: string;
  };
  readonly slack: {
    readonly webhookUrl?: string;
  };
  readonly roas: {
    readonly productMappings: readonly RoasProductMapping[];
  };
}

export interface RoasProductMapping {
  readonly campaignId: string;
  readonly productId: string;
}

const defaultRoasProductMappings: readonly RoasProductMapping[] = [
  {
    campaignId: '120243899063050642',
    productId: '6958345',
  },
  {
    campaignId: '120246047047580642',
    productId: '6976231',
  },
];

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
    throw new Error('PORT must be a positive integer');
  }

  return port;
};

const metaTestEventCode = getOptionalEnv('META_TEST_EVENT_CODE');
const metaEventSourceUrl = getOptionalEnv('META_EVENT_SOURCE_URL');
const metaAdAccountId = getOptionalEnv('META_AD_ACCOUNT_ID');
const metaMarketingAccessToken = getOptionalEnv('META_MARKETING_ACCESS_TOKEN');
const payhipApiKey = getOptionalEnv('PAYHIP_API_KEY');
const payhipWebhookToken = getOptionalEnv('PAYHIP_WEBHOOK_TOKEN');
const mongoDbUrl = readMongoDbUrl();
const cronSecret = getOptionalEnv('CRON_SECRET');
const slackWebhookUrl = getOptionalEnv('SLACK_WEBHOOK_URL');
const roasProductMappings = parseRoasProductMappings(
  getOptionalEnv('ROAS_PRODUCT_MAPPINGS'),
);

const metaConfig: AppConfig['meta'] = {
  graphApiVersion: getOptionalEnv('META_GRAPH_API_VERSION') ?? 'v25.0',
  pixelId: getRequiredEnv('META_PIXEL_ID'),
  accessToken: getRequiredEnv('META_ACCESS_TOKEN'),
  marketingAccessToken:
    metaMarketingAccessToken ?? getRequiredEnv('META_ACCESS_TOKEN'),
  ...(metaAdAccountId ? { adAccountId: metaAdAccountId } : {}),
  ...(metaTestEventCode ? { testEventCode: metaTestEventCode } : {}),
  ...(metaEventSourceUrl ? { eventSourceUrl: metaEventSourceUrl } : {}),
};

const payhipConfig: AppConfig['payhip'] = {
  ...(payhipApiKey ? { apiKey: payhipApiKey } : {}),
  ...(payhipWebhookToken ? { webhookToken: payhipWebhookToken } : {}),
};

const customerioConfig: AppConfig['customerio'] = {
  apiSecret: getRequiredEnv('CUSTOMERIO_API_SECRET'),
};

const cronConfig: AppConfig['cron'] = {
  ...(cronSecret ? { secret: cronSecret } : {}),
};

const slackConfig: AppConfig['slack'] = {
  ...(slackWebhookUrl ? { webhookUrl: slackWebhookUrl } : {}),
};

export const config: AppConfig = {
  port: parsePort(process.env.PORT),
  mongoDbUrl,
  meta: metaConfig,
  payhip: payhipConfig,
  customerio: customerioConfig,
  cron: cronConfig,
  slack: slackConfig,
  roas: {
    productMappings: roasProductMappings,
  },
};

function readMongoDbUrl(): string {
  const value = getOptionalEnv('MONGO_DB_URL');

  if (value) {
    return value;
  }

  if (getOptionalEnv('VERCEL')) {
    throw new Error('Missing required environment variable: MONGO_DB_URL');
  }

  return 'mongodb://localhost:27017/payhip-capi-attribution';
}

function parseRoasProductMappings(
  value: string | undefined,
): readonly RoasProductMapping[] {
  if (!value) {
    return defaultRoasProductMappings;
  }

  const parsed = JSON.parse(value) as unknown;

  if (!Array.isArray(parsed)) {
    throw new Error('ROAS_PRODUCT_MAPPINGS must be a JSON array');
  }

  return parsed.map((mapping, index) => {
    if (
      typeof mapping !== 'object' ||
      mapping === null ||
      Array.isArray(mapping)
    ) {
      throw new Error(`ROAS_PRODUCT_MAPPINGS[${index}] must be an object`);
    }

    const record = mapping as Record<string, unknown>;
    const campaignId = readRequiredMappingString(record, index, 'campaignId');
    const productId = readRequiredMappingString(record, index, 'productId');

    return {
      campaignId,
      productId,
    };
  });
}

function readRequiredMappingString(
  record: Record<string, unknown>,
  index: number,
  key: keyof RoasProductMapping,
): string {
  const value = record[key];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`ROAS_PRODUCT_MAPPINGS[${index}].${key} must be a string`);
  }

  return value;
}

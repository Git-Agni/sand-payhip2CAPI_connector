import 'dotenv/config';
type ENV = 'production' | 'development' | 'test';
export interface AppConfig {
  readonly port: number;
  readonly env: ENV;
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
  {
    campaignId: '120246047047580642',
    productId: '7854301',
  },
  {
    campaignId: 'organic',
    productId: '6769995',
  },
  {
    campaignId: 'organic',
    productId: '7562115',
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

const env = {
  ENV:
    process.env.NODE_ENV === 'production'
      ? 'production'
      : ('development' as ENV),
  PORT: process.env.PORT,
  MONGO_DB_URL: getOptionalEnv('MONGO_DB_URL'),
  VERCEL: getOptionalEnv('VERCEL'),
  META_GRAPH_API_VERSION: getOptionalEnv('META_GRAPH_API_VERSION') ?? 'v25.0',
  META_PIXEL_ID: getRequiredEnv('META_PIXEL_ID'),
  META_ACCESS_TOKEN: getRequiredEnv('META_ACCESS_TOKEN'),
  META_AD_ACCOUNT_ID: getOptionalEnv('META_AD_ACCOUNT_ID'),
  META_MARKETING_ACCESS_TOKEN: getOptionalEnv('META_MARKETING_ACCESS_TOKEN'),
  META_TEST_EVENT_CODE: getOptionalEnv('META_TEST_EVENT_CODE'),
  META_EVENT_SOURCE_URL: getOptionalEnv('META_EVENT_SOURCE_URL'),
  PAYHIP_API_KEY: getOptionalEnv('PAYHIP_API_KEY'),
  PAYHIP_WEBHOOK_TOKEN: getOptionalEnv('PAYHIP_WEBHOOK_TOKEN'),
  CUSTOMERIO_API_SECRET: getRequiredEnv('CUSTOMERIO_API_SECRET'),
  CRON_SECRET: getOptionalEnv('CRON_SECRET'),
  SLACK_WEBHOOK_URL: getOptionalEnv('SLACK_WEBHOOK_URL'),
  ROAS_PRODUCT_MAPPINGS: getOptionalEnv('ROAS_PRODUCT_MAPPINGS'),
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

export const config: AppConfig = {
  port: parsePort(env.PORT),
  env: env.ENV,
  mongoDbUrl: readMongoDbUrl(),
  meta: {
    graphApiVersion: env.META_GRAPH_API_VERSION,
    pixelId: env.META_PIXEL_ID,
    accessToken: env.META_ACCESS_TOKEN,
    marketingAccessToken:
      env.META_MARKETING_ACCESS_TOKEN ?? env.META_ACCESS_TOKEN,
    ...(env.META_AD_ACCOUNT_ID ? { adAccountId: env.META_AD_ACCOUNT_ID } : {}),
    ...(env.META_TEST_EVENT_CODE
      ? { testEventCode: env.META_TEST_EVENT_CODE }
      : {}),
    ...(env.META_EVENT_SOURCE_URL
      ? { eventSourceUrl: env.META_EVENT_SOURCE_URL }
      : {}),
  },
  payhip: {
    ...(env.PAYHIP_API_KEY ? { apiKey: env.PAYHIP_API_KEY } : {}),
    ...(env.PAYHIP_WEBHOOK_TOKEN
      ? { webhookToken: env.PAYHIP_WEBHOOK_TOKEN }
      : {}),
  },
  customerio: {
    apiSecret: env.CUSTOMERIO_API_SECRET,
  },
  cron: {
    ...(env.CRON_SECRET ? { secret: env.CRON_SECRET } : {}),
  },
  slack: {
    ...(env.SLACK_WEBHOOK_URL ? { webhookUrl: env.SLACK_WEBHOOK_URL } : {}),
  },
  roas: {
    productMappings: parseRoasProductMappings(env.ROAS_PRODUCT_MAPPINGS),
  },
};

function readMongoDbUrl(): string {
  if (env.MONGO_DB_URL) {
    return env.MONGO_DB_URL;
  }

  if (env.VERCEL) {
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

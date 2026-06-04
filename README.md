# Payhip CAPI Attribution

Express webhook listener that accepts Payhip `paid` webhooks and forwards them to Meta
Conversions API as `Purchase` events.

## Environment

Create these variables in your runtime environment:

```sh
META_PIXEL_ID=your_pixel_id
META_ACCESS_TOKEN=your_meta_capi_access_token
META_AD_ACCOUNT_ID=your_meta_ad_account_id
META_MARKETING_ACCESS_TOKEN=optional_meta_marketing_api_access_token
META_GRAPH_API_VERSION=v25.0
META_EVENT_SOURCE_URL=https://your-site.example
META_TEST_EVENT_CODE=optional_meta_test_event_code
PAYHIP_API_KEY=optional_payhip_api_key_for_signature_verification
PAYHIP_WEBHOOK_TOKEN=optional_shared_url_token
MONGO_DB_URL=mongodb://localhost:27017/payhip-capi-attribution
CRON_SECRET=shared_secret_for_vercel_cron
SLACK_WEBHOOK_URL=optional_slack_incoming_webhook_url
ROAS_PRODUCT_MAPPINGS='[{"campaignId":"120243899063050642","productId":"6958345"},{"campaignId":"120246047047580642","productId":"6976231"}]'
LOG_LEVEL=info
LOG_FORMAT=pretty
PORT=3000
```

`META_PIXEL_ID` and `META_ACCESS_TOKEN` are required. `PAYHIP_API_KEY` is
optional but recommended; when set, the listener verifies Payhip's `signature`
field before accepting the webhook.

`META_AD_ACCOUNT_ID` is required for the ROAS cron. `META_MARKETING_ACCESS_TOKEN`
is optional and defaults to `META_ACCESS_TOKEN` when not set.

`ROAS_PRODUCT_MAPPINGS` maps Meta campaign IDs to Payhip product IDs for
campaign ROAS logging. Payhip products without a mapping are logged under
`unknown campaign` with the Payhip product name.

`SLACK_WEBHOOK_URL` is optional. When set, the ROAS cron posts the campaign
report to that Slack incoming webhook after calculating it.

`LOG_LEVEL` is optional and defaults to `info`. Supported values are `debug`,
`info`, `warn`, and `error`. `LOG_FORMAT` is optional and defaults to `pretty`;
set it to `json` to emit structured JSON lines.

`MONGO_DB_URL` is required on Vercel. For local development only, it defaults to
`mongodb://localhost:27017/payhip-capi-attribution`.

`PAYHIP_WEBHOOK_TOKEN` is also optional; when set, configure Payhip to call:

```text
https://your-domain.example/webhooks/payhip?token=your_token
```

## Routes

- `GET /health`
- `POST /webhooks/payhip`
- `GET /cron/slack-roas`
- `GET /cron/slack-roas/daily`
- `GET /cron/slack-roas/weekly`
- `GET /cron/slack-roas/monthly`

Only Payhip `paid` webhooks are sent to Meta. Other Payhip event types return
`200` with an ignored status so Payhip does not retry them.

The Vercel cron route requires `Authorization: Bearer ${CRON_SECRET}`. The cron
accepts `daily`, `weekly`, or `monthly` as a path segment, query string
`period`, or JSON body field. It queries stored Payhip purchases and Meta Ads
Insights, then logs campaign ROAS values to the console and posts them to Slack
when `SLACK_WEBHOOK_URL` is configured.

## Commands

```sh
docker compose up -d mongodb
npm run build
npm start
```

# Payhip CAPI Attribution

Express webhook listener that accepts Payhip `paid` webhooks and forwards them to Meta
Conversions API as `Purchase` events.

## Environment

Create these variables in your runtime environment:

```sh
META_PIXEL_ID=your_pixel_id
META_ACCESS_TOKEN=your_meta_capi_access_token
META_GRAPH_API_VERSION=v25.0
META_EVENT_SOURCE_URL=https://your-site.example
META_TEST_EVENT_CODE=optional_meta_test_event_code
PAYHIP_API_KEY=optional_payhip_api_key_for_signature_verification
PAYHIP_WEBHOOK_TOKEN=optional_shared_url_token
LOG_LEVEL=info
PORT=3000
```

`META_PIXEL_ID` and `META_ACCESS_TOKEN` are required. `PAYHIP_API_KEY` is
optional but recommended; when set, the listener verifies Payhip's `signature`
field before accepting the webhook.

`LOG_LEVEL` is optional and defaults to `info`. Supported values are `debug`,
`info`, `warn`, and `error`. Logs are emitted as JSON lines.

`PAYHIP_WEBHOOK_TOKEN` is also optional; when set, configure Payhip to call:

```text
https://your-domain.example/webhooks/payhip?token=your_token
```

## Routes

- `GET /health`
- `POST /webhooks/payhip`

Only Payhip `paid` webhooks are sent to Meta. Other Payhip event types return
`200` with an ignored status so Payhip does not retry them.

## Commands

```sh
npm run build
npm start
```

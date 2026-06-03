# Slack ROAS Payhip Analytics Plan

Date: 2026-06-03

## Summary

This plan adds durable Payhip purchase storage and Slack-based ROAS reporting to the Payhip CAPI attribution service.

The intended flow is:

1. Payhip sends `paid` webhooks to the existing service.
2. The service validates the webhook and persists purchase data to MongoDB Atlas.
3. A shared ROAS report service queries stored Payhip purchases for revenue.
4. The same report service queries Meta Ads Insights for ad spend.
5. Slack receives manual or scheduled ROAS summaries.

Slack should not be the recurring scheduler. Slack slash commands are user-triggered requests. For automated reports, Vercel Cron should call this deployed service, and this service should post the computed report into Slack.

## Target Architecture

### Purchase Storage

- Store validated Payhip `paid` webhooks in MongoDB Atlas.
- Use Payhip `id` as the unique transaction key so duplicate webhook deliveries become idempotent upserts.
- Store analytics-friendly fields:
  - Payhip transaction id
  - email
  - currency
  - gross price in cents
  - optional Stripe fee
  - optional Payhip fee
  - purchase timestamp
  - payment type
  - product items
  - raw webhook payload
  - created and updated timestamps

### ROAS Report Service

- Add one shared internal service that computes ROAS for a date range.
- Query MongoDB for:
  - gross revenue
  - purchase count
  - average order value
  - optional fees, once available
- Query Meta Ads Insights for:
  - ad spend in the same date range
- Compute:
  - revenue
  - spend
  - ROAS
  - purchase count
  - average order value

The manual Slack command and automated Vercel Cron endpoint should both use this same report service so the numbers stay consistent.

### Manual Slack Command

- Add `POST /slack/commands/roas`.
- Configure a Slack slash command, for example `/roas`, with this route as the Request URL.
- Verify requests with `SLACK_SIGNING_SECRET`.
- Support command text:
  - `/roas today`
  - `/roas yesterday`
  - `/roas 7d`
  - `/roas 30d`
  - `/roas 2026-06-01..2026-06-07`
- Respond with a Slack-friendly summary.
- If the report takes too long to compute, acknowledge Slack quickly and post the final report using Slack's `response_url`.

### Automated Vercel Cron Report

- Add `GET /cron/slack-roas`.
- Protect it with `Authorization: Bearer ${CRON_SECRET}`.
- Default the automated report to the previous completed day for daily reporting.
- Post the result into the configured Slack channel using either:
  - Slack Web API `chat.postMessage`, or
  - an incoming webhook URL.

Recommended Vercel cron configuration:

```json
{
  "crons": [
    {
      "path": "/cron/slack-roas",
      "schedule": "30 3 * * *"
    }
  ]
}
```

This runs daily at `03:30 UTC`, which maps to `09:00 Asia/Kolkata`.

For weekly reporting later, only the cron expression and report date-range default should need to change.

## Required Environment Variables

```sh
MONGODB_URI=
MONGODB_DB_NAME=

META_AD_ACCOUNT_ID=
META_MARKETING_ACCESS_TOKEN=

SLACK_SIGNING_SECRET=
SLACK_BOT_TOKEN=
SLACK_ROAS_CHANNEL_ID=

CRON_SECRET=
```

If using an incoming webhook instead of `chat.postMessage`, replace `SLACK_BOT_TOKEN` and `SLACK_ROAS_CHANNEL_ID` with:

```sh
SLACK_ROAS_WEBHOOK_URL=
```

Existing Meta CAPI and Payhip webhook environment variables should remain unchanged.

## Implementation Phases

### Phase 1: Persist Payhip Purchases

- Add MongoDB Atlas client configuration.
- Add a purchase repository/service.
- Persist validated `paid` Payhip webhook payloads after validation.
- Upsert by Payhip transaction id.
- Preserve the existing Meta CAPI forwarding behavior.

### Phase 2: Build ROAS Report Service

- Add date-range parsing for report periods.
- Aggregate purchase revenue from MongoDB.
- Fetch spend from Meta Ads Insights for the matching date range.
- Compute revenue, spend, ROAS, purchase count, and average order value.
- Define zero-spend behavior explicitly so reports do not crash or mislead.

### Phase 3: Add Manual Slack `/roas`

- Add the slash command route.
- Verify Slack signatures.
- Parse supported date-range commands.
- Format the result for Slack.
- Reuse the shared report service.

### Phase 4: Add Vercel Cron Automated Slack Report

- Add the protected cron route.
- Add `vercel.json` cron configuration.
- Reuse the shared report service.
- Post the generated report into Slack.
- Default daily reports to the previous completed day.

## Test Plan

- Purchase persistence:
  - inserts a new validated Payhip purchase
  - upserts duplicate webhook deliveries by Payhip id
  - keeps existing Meta CAPI forwarding behavior intact
- Date-range parsing:
  - `today`
  - `yesterday`
  - `7d`
  - `30d`
  - explicit `YYYY-MM-DD..YYYY-MM-DD`
- ROAS math:
  - computes revenue divided by spend
  - handles zero spend
  - computes purchase count and average order value
- Slack slash command:
  - rejects invalid signatures
  - accepts valid signatures
  - formats successful reports
- Vercel cron endpoint:
  - rejects missing or invalid `Authorization`
  - accepts `Authorization: Bearer ${CRON_SECRET}`
  - defaults to the previous completed day
- External integrations:
  - mock MongoDB
  - mock Meta Ads API
  - mock Slack message send
- Verification:
  - run targeted Vitest tests
  - run `npm run build`

## Assumptions

- MongoDB Atlas is the purchase store.
- Meta Ads API is the ad-spend source.
- Vercel Cron is the scheduler because this service is deployed on Vercel.
- The first automated schedule is daily at `09:00 Asia/Kolkata`.
- ROAS v1 is aggregate account-level ROAS, not campaign-level or ad-level attribution.
- Gross Payhip price is the primary revenue number. Fees can be shown separately after they are reliably stored.
- Manual Slack reports and automated cron reports should share the same report service.

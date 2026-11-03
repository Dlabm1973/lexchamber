# Stitch Express subscription setup

Implemented from the Stitch Express OpenAPI 1.0 specification retrieved 3 November 2026, https://express.stitch.money/api/openapi.json. This is the Express REST API, not the Enterprise GraphQL API.

## Owner setup form

The owner can enter test credentials directly at https://www.lexchamber.co.za/billing/setup. Only verified Clerk owners listed in OWNER_EMAILS may access the page/API. Values are AES-256-GCM encrypted in D1, with a random nonce and domain-bound authenticated context. STITCH_CONFIG_KEY is held as a separate hosted secret. GET returns presence flags only. Blank fields retain saved values. Saving never triggers a payment. The connection check reads one subscription listing and confirms credentials/recurring scope; it does not test webhook delivery. Enabling the checkbox permits approved test accounts to use checkout. The form cannot enable live mode.

## Runtime settings

Store values only in hosted server environment settings, never source, browser code or practice Sheets:

- STITCH_CLIENT_ID: test client ID initially.
- STITCH_CLIENT_SECRET: replacement client secret.
- STITCH_WEBHOOK_SECRET: Svix signing secret from webhook registration.
- STITCH_MODE: test (live requires explicit activation and matching non-test credentials).
- STITCH_ENABLED: true only after credentials and URLs are configured.
- STITCH_TEST_EMAILS: comma-separated verified test-account email addresses; falls back to OWNER_EMAILS when omitted.

Checkout fails closed unless all required settings and BILLING_DB are present. Test transactions never grant live subscription access. Test subscriptions must be reviewed/cleared in a controlled migration before switching the same account to live; never discard an uncancelled provider subscription.

## Stitch dashboard

Ask express-support@stitch.money to enable the client_recurringpaymentconsentrequest scope. The documentation says card subscriptions are not available by default.

Register redirect URL: https://www.lexchamber.co.za/billing/return
Register webhook endpoint: https://www.lexchamber.co.za/api/billing/webhook
Keep webhook signing secret private. Registration can be done through Stitch dashboard or its documented API; do not create duplicate endpoints.

## Behaviour

The current deployed product has one plan: R799 monthly or R8,149.80 annually (15% saving). The amount is fixed server-side in cents. The customer explicitly accepts recurring billing and is redirected to Stitch to enter card details. A paid subscription starts immediately, rather than deferring until the trial ends. The next recurrence anchors no later than day 28 to avoid skipped short months and is displayed by Stitch before authorisation.

A pending checkout is reused. Unconfirmed creates cannot be blindly retried because the API does not document idempotency keys; support must reconcile merchantReference with Stitch first. Changing plans, replacing cancelled subscriptions and test-to-live migration currently require support review.

The return page only reads stored status; query parameters never activate access. Webhooks are verified against the raw body, signed timestamp (five-minute tolerance), payment amount, stored subscription ID and an independently retrieved paid payment/reference. D1 stores billing metadata only, not practice records or card data. Unique message/payment IDs and monotonic paid-through dates prevent replay-based extensions. A cancelled subscription retains confirmed paid access through its existing expiry. Only payment.paid is documented; unsuccessful renewals receive no entitlement extension and access expires naturally.

## Acceptance testing still required

With test credentials: create and authorise a hosted subscription, confirm initial paid webhook and monthly/annual values; replay webhook without extending access; exercise failed/abandoned checkout; cancel and verify provider cancellation; test renewal and out-of-order delivery; verify annual recurrence and displayed date. Test account remains without live paid entitlement.

No provider calls or real card payments were made during implementation. Local tests use synthetic transport and SQLite. Do not enable live mode until provider sandbox checks pass.

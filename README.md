# LexChamber

Practice finance by **QAGA Data (Pty) Ltd**. Copyright © 2026 QAGA Data (Pty) Ltd. All rights reserved.

LexChamber provides a public product page, plan enquiries, account sign-up/sign-in, and a protected practice workspace for matters, invoices, statements, payments, income/expenses, bank records and reporting. Business data stays in each practice's configured backend. This deployment connects one approved practice to its Google Sheet; new client backends require separate onboarding.

## Stack

- Vanilla JavaScript frontend and Cloudflare Worker backend.
- Official Clerk JavaScript SDK and `@clerk/backend` for authentication.
- Signed Google Apps Script requests to the practice-owned Google Sheet.
- Brevo for transactional email; WhatsApp uses device sharing with a PDF attachment.
- esbuild bundles the Worker. No Next.js runtime is required.

## Build and check

Node.js 20.9+ is required.

```sh
npm ci
npm run build
npm test
node scripts/validate-artifact.mjs
```

The Worker entrypoint is `dist/server/index.js`. Build output and local environment files are excluded from Git. Source assets, the QAGA logo, backend script, setup notes and automated checks are included.

## Runtime configuration

Configure these on the hosting service. Do not commit actual credentials; `.env.example` lists names only.

| Variable | Purpose |
| --- | --- |
| `AUTH_PROVIDER` | `clerk` to require Clerk sessions; `chatgpt` for the retained Sites identity integration. |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key. This Worker uses this name rather than Next.js's `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`. |
| `CLERK_SECRET_KEY` | Matching Clerk backend secret; server only. |
| `ALLOWED_EMAILS` | Comma-separated approved, verified primary email addresses. Registration alone does not grant access to practice records. |
| `APPS_SCRIPT_URL` | Deployed practice-owned Apps Script endpoint. |
| `APPS_SCRIPT_SECRET` | HMAC secret shared with Apps Script. |
| `BREVO_API_KEY` | Optional transactional email API secret. Verify the accounts sender with Brevo. |

Use matching Clerk development keys for testing. A production launch requires a Clerk production instance, live keys and the corresponding domain/DNS setup. Clerk development and production users are separate.

The landing page is `/`; the workspace is `/app`; sign-in and sign-up are `/sign-in` and `/sign-up`. Server-side checks protect financial APIs and private assets. Frontend identity claims and plan preferences never grant data access or paid entitlements.

## Commercial status

Starter (R299/month), Professional (R599/month) and Practice Plus (R999/month) are proposed launch plans. Buttons record plan interest. Subscription billing and online checkout are not connected.

See [Clerk setup](docs/CLERK_SETUP.md), [backend setup](docs/SETUP.md), [working-copy setup](docs/WORKING_COPY_SETUP.md), [bank statements](docs/BANK_STATEMENTS_SETUP.md), and [mapping](docs/MAPPING.md). Earlier dated verification notes describe the state at the time they were written.

Public enquiries: info@lexchamber.co.za. Practice invoice emails: accounts@lexchamber.co.za.

## Portable source export

Private spreadsheet IDs, banking defaults, hosted project identifiers and backend endpoints have been replaced by configuration placeholders. Configure your own hosting identity and practice backend before deployment. Runtime secrets are not included.

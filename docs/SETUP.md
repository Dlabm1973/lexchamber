# Advocate DJ Badenhorst | Practice Finance — connection and publication

The app source and private Sites registration exist. Production publication is blocked by this environment's inability to resolve `git.chatgpt-team.site`. There is no verified live URL. The existing Practice spreadsheet has only been read; no live records or structure have been changed.

## 1. Prepare an isolated test spreadsheet

1. In Google Drive, make a native copy of the entire Practice spreadsheet. Do not export/import it: preserve formulas and formatting.
2. Open the copy, select Extensions → Apps Script, and paste `backend/Code.gs` into `Code.gs`.
3. In Apps Script → Project Settings → Script properties, add:

| Property | Value |
|---|---|
| `SPREADSHEET_ID` | ID of the test copy; later the live ID `CLIENT_SPREADSHEET_ID` |
| `SHARED_SECRET` | A new secret generated locally, preferably 32 random bytes encoded as hex. Do not reuse any repository secret. |
| `ALLOWED_EMAILS` | Comma-separated approved ChatGPT sign-in email addresses, including your own |

4. Run `initialisePractice` in the Apps Script editor. Authorise Sheets and Drive access. The function validates the exact existing headers, creates a native backup and only appends supporting columns/new tabs. `LAST_BACKUP_ID` records the backup. Sheet5 is not written to. Before running, inspect `docs/MAPPING.md`.
5. Deploy → New deployment → Web app. Execute as **Me** (the spreadsheet owner); access **Anyone**. The transport endpoint is reachable, but every read/write requires a valid HMAC, an approved actor, a timestamp and a nonce. Unsigned GETs expose no records. Never paste the shared secret into a URL, app form or frontend.
6. Copy the `/macros/s/.../exec` deployment URL. On updates, deploy a new version of the same web app; saving code alone does not update a deployment.

## 2. Configure the private Site

The registered Site ID is `YOUR_SITES_PROJECT_ID`. Reuse it; do not create a replacement.

Configure these private server environment variables through Sites:

| Variable | Value |
|---|---|
| `APPS_SCRIPT_URL` | The deployed test backend's exact HTTPS `/exec` URL |
| `APPS_SCRIPT_SECRET` | Same new value as `SHARED_SECRET`; mark as a secret |
| `ALLOWED_EMAILS` | Same approved email list as the backend |

Keep the Site owner-private. The server requires platform-authenticated identity and checks the allowlist before reads, writes and private document downloads. The browser receives neither signing secret nor Google tokens. There is no separate database and no permanent browser record store.

This Sites environment did not expose workspace connector eligibility, so an app cannot simply reuse the author's Google Drive connector credentials. The signed backend is the supplied integration path.

## 3. Build and publish in a network-enabled Codex/Sites environment

Open the `practice-finance` checkout. It uses the dependency-free Worker ESM starter; the bundled PDF library is included with its MIT licence. No package installation is required.

```bash
node scripts/build.mjs
node --test --test-isolation=none tests/*.test.mjs
```

Use the Sites hosting skill's `site-workflow.mjs` with the existing project ID and a fresh `create_source_repository_write_credential`. Supply the credential through its hidden stdin JSON, never a file or command-line argument. Pass remaining tests/build as `commands` and an absolute archive path. Then use `save_version_and_deploy_private` with the workflow's exact pushed commit and archive, and verify deployment status is `succeeded` before treating the URL as live.

The current source manifest is `.openai/hosting.json`. No D1/R2 business-data bindings are used. The Worker exports `default.fetch`; its generated assets module is included in `dist/server`.

## 4. Review settings and verify on the test copy

1. Sign in with the approved account. Refresh; check existing firms and invoice IDs against the test copy.
2. Set a dedicated **private** Google Drive folder ID in Settings. Confirm banking particulars and VAT registration; tick the review acknowledgement. VAT is off by default. The imported bank, contact and rate defaults came from the existing Billing page and remain subject to your review.
3. Add a test firm and a linked matter. Historical invoice matter names are retained; they are not automatically converted into new Cases rows.
4. Create and save a draft, reload, edit its reference and confirm only the intended row changed.
5. Issue it. The backend allocates the next numeric ID under a script lock. The record stays `ISSUING` until its original PDF has been privately stored and read back; use **Complete PDF issue** after an interrupted upload.
6. Simulate a dropped response after a save, then retry the pending submission. Check one invoice/operation only. The pending input is held in the current open session, not browser storage. After closing a failed session, refresh and review the spreadsheet before recreating a submission.
7. Record partial/full/overpayments. Check the Payments row, one linked income Transaction, invoice paid amount and firm credit. Reverse one payment and check balances and reports.
8. Test a long invoice, PDF preview/download/print, and the phone's native file share. Test the fallback separately: it downloads the PDF and opens WhatsApp with text; **manually attach the PDF**. No delivery status is inferred.
9. Check CSV/PDF reports and firm statements, then compare existing formulas, formatting and unrelated columns with the backup.
10. Test denied access and a failed backend connection. Neither must show sample records or a Saved message.

Keep all test activity in the test copy. The local simulations do not establish that the deployed Google API connection or an actual WhatsApp device works.

## 5. Switch to the live spreadsheet

After verifying the test deployment, bind/deploy the script for the original spreadsheet with its exact live ID. Run its backed-up schema initialisation, use the same approved account policy, then change the Site's private backend configuration to this live deployment and republish if needed. Keep the test backend separate.

Review the missing-ID migration preview before running it. It creates another backup and fills only missing `id` cells. It does not infer malformed dates, classify unspecified transactions, import Sheet5, recreate receipts for historical PAID invoices, or replace invoice numbers.

## Practical limits and remaining verification

- Hosted sign-in, live Sheets writes, Drive uploads, receipt access and phone sharing are awaiting deployment/configuration and must be tested as above.
- Read-time versions include the full row, so manual changes seen before saving produce an explicit conflict. Google Sheets manual editing does not honour Apps Script locks. Avoid simultaneous manual edits during a pending app save; the app cannot provide database-level atomicity against an external edit made in the middle of a Sheets write.
- A write journal and per-field readback support interrupted-write recovery. Formula cells are checked before row updates; only explicitly mapped cells are touched. Financial changes are audited, including cancellations and credit notes.
- Historical PAID/blank-paidAmount entries retain PAID and are flagged; no missing cash receipt is invented. Missing due dates and unclassified or malformed transaction dates need source-based review.
- Overpayment credits remain in the payment ledger and firm reports. Applying an existing credit to another invoice is not currently a separate workflow. Credit notes reduce invoice balances and retain the original PDF; a separate credit-note PDF workflow is not included.
- Historical invoices without a registered original PDF can be reconstructed for download, with a notice. That reconstruction cannot recover an original historical PDF.
- Current attachments are PDF/JPEG/PNG up to 5 MB. Statements and reports download locally; issued invoice PDFs and expense receipts are stored privately in Drive.
- PDF standard fonts replace unsupported characters outside Latin-1 with `?`; test names requiring other scripts before use.
- Optional browser WebMCP tools are feature-detected. Validation in a supported WebMCP browser was unavailable here.

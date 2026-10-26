# Authoritative spreadsheet mapping

Live metadata and the first seven populated rows per tab were read on 1 October 2026. This was a bounded inspection, not a full historical audit. Locale is `en_GB`, timezone `Africa/Johannesburg`. No live write or structural migration was executed.

| Tab | Exact original headers | App treatment |
|---|---|---|
| Clients | `id`, `Firm`, `email`, `phone`, `Attorney`, `address`, `totalInvoiced`, `activeCases`, `createdAt`, `Partners` | Firm identity separate from attention contact. Partners JSON preserved; stored summaries not used as financial totals. |
| Invoices | `id`, `clientId`, `clientName`, `matterName`, `amount`, `paidAmount`, `lastpaymentDate`, `status`, ` date`, `dueDate`, `lineItems`, `Partner ID`, `Partner Name`, `Partner Email` | Leading space in ` date` and exact spelling `lastpaymentDate` preserved. Historical number, amount, JSON and PAID status retained. |
| Transactions | `id`, `date`, `description`, `amount`, `type`, `category` | One linked Transaction per receipt; no adding invoice paid amounts again to income. Missing types and malformed dates remain flagged. |
| Cases | `id`, `title`, `clientName`, `practiceArea`, `status`, `dateOpened`, `lastUpdated`, `description`, `notes` | Linked firm ID added for new/editable matters. Header-only in inspected source rows. |
| Sheet5 | `Date`, `Description`, `Amount`, `Balance` | Read-only inspection view. Never merged into Transactions or included in financial totals. |

Supporting columns are appended after the actual existing last used column. Unknown columns, formulas and formatting are preserved. Full-row versions detect changes even in unknown columns. Formula-bearing target cells reject writes.

| Tab | Supporting columns |
|---|---|
| Clients | `archived`, `version` |
| Invoices | `matterId`, `reference`, `Partner Phone`, `subtotalCents`, `vatCents`, `vatRegistered`, `vatNumber`, `vatRate`, `vatTreatment`, `creditCents`, `pdfFileId`, `issuedSnapshot`, `issuedAt`, `cancelReason`, `version` |
| Transactions | `paymentId`, `reference`, `method`, `receiptFileId`, `reversed`, `isTest`, `version` |
| Cases | `clientId`, `archived`, `version` |

New supporting tabs: `Payments`, `Audit`, `Settings`, `Operations`, `OperationParts`, `Documents`, `CreditNotes`. Their exact schemas are in `NEW_HEADERS` in `backend/Code.gs`. OperationParts splits larger recovery plans across bounded cells. These tabs live in the same spreadsheet.

Monetary business calculations use integer cents. Quantities use four decimal places, rates two; each line is rounded to cents before totals/VAT. VAT settings are snapshotted when issued and do not modify historical amounts. A final numeric invoice ID is allocated only on Issue, under `LockService`; a draft uses a stable `DRAFT-...` ID.

The new implementation adapts the repository's firm/contact and line-item models and reuses its practice, address, banking and rate defaults from `pages/Billing.tsx`. Its PDF content and native-file-sharing approach were rebuilt with paginated A4 output. The original `sheetsService.ts` mock fallback, random read IDs, opaque `no-cors` saves and `AuthGate.tsx` browser PIN are deliberately replaced. `Clients.tsx`, `Finances.tsx`, `Dashboard.tsx`, `Settings.tsx`, `types.ts` and their flows were inspected. No repository `.env` contents or secrets were read or copied.

# Verification — 1 October 2026

## Completed

- Inspected all requested repository files, including existing PDF content, native share code, settings/Apps Script code and exact data types. Did not read repository `.env`.
- Read live spreadsheet metadata and bounded A1:AB8 rectangles for all five original tabs. Confirmed exact headers, historical PAID/blank-payment rows, missing Transaction IDs, malformed dates and the separate Sheet5 records.
- Built the private Worker artifact and validated its default `fetch` export.
- Eleven automated checks passed in an isolated in-memory implementation of the Apps Script spreadsheet service and direct Worker tests:
  1. Draft persistence, same-operation retry and amendment of the intended row.
  2. Recovery after an interrupted partial invoice write, with no duplicate.
  3. Partial/full/overpayments, payment reversal, retained credit and single-count income.
  4. Manual edit conflicts and formula protection.
  5. Numeric sequence continuation with drafts outside the final numbering sequence.
  6. Historical status/JSON/date flags, unchanged Sheet5 and backed-up missing-ID migration.
  7. Acknowledged settings persistence and stale-settings conflicts.
  8. Decimal rounding, VAT and strict date validation.
  9. Long A4 invoice pagination with an actual PDF.
  10. Anonymous and non-approved API denial.
  11. Explicit missing-connection error, no mock records and rejected cross-origin write.
- Rendered and visually inspected the first page of the long PDF test, and extracted its text. The 80-item test invoice spans 17 A4 pages, repeats table headings and retains the R250,000 total and banking section.

## Not established

- No production deployment: the publishing Git host could not be resolved from the permitted execution environment.
- No live spreadsheet or Drive writes: the supplied Apps Script must be deployed and configured first. These simulation checks are not live Google API integration tests.
- No browser interaction/phone device verification. Native share, WhatsApp attachment fallback, printing, hosted sign-in and screen responsiveness need the deployment/device checks listed in SETUP.md.
- No supported WebMCP browser validation.
- No full historical spreadsheet audit; the read was deliberately bounded. Existing IDs, formulas and formatting have not been changed.

The Sites registration exists and must be reused. The app must not be represented as live or connected until publication and real integration checks pass.

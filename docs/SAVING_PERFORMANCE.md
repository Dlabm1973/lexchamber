# Saving performance update — 28 October 2026

Google Sheets remains authoritative. The backend now verifies a changed row directly, instead of fetching and hashing its entire table again for every step. Operation result/status writes use one adjacent range and flush. Invoice issue/amend responses include the confirmed invoice snapshot and version, letting the updated client generate its PDF without an intermediate full practice read. Old deployments remain compatible through the existing full-read fallback.

Activation: update the code in the existing Apps Script project, preserve Script properties and its spreadsheet ID/secret, then Deploy > Manage deployments > Edit > New version > Deploy. Keep the current deployment URL. The public backend guide includes current generic code; the private working-copy download preserves its original sheet restriction. No schema migration is needed.

These changes are tested with isolated spreadsheet fixtures, not timed against the user's live Apps Script deployment. No measured speedup is claimed. The production log window available during this review contained public/crawler requests rather than usable recent save timings; previous observed writes and full reads each took tens of seconds. Google execution, locks and service quotas can still affect latency.

66 tests passed, including idempotent retries, interrupted operations, formula protection, single-row readback and invoice response snapshots. Pending browser saves are not discarded or assigned new operation IDs. The user must update the existing Google deployment to activate the backend portion.

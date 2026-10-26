# Client-owned backend setup

1. Create a Google Sheet owned by the practice. Start with a test copy.
2. Copy backend/Code.gs into Apps Script. Set SPREADSHEET_ID, SHARED_SECRET and ALLOWED_EMAILS in script properties.
3. Review the schema and run initialisePractice; it creates a backup before adding supporting columns.
4. Deploy the Apps Script web app, executing as its owner. Signed HMAC requests, approved actors, timestamps and nonces protect the endpoint.
5. Configure APPS_SCRIPT_URL, APPS_SCRIPT_SECRET and ALLOWED_EMAILS as server settings. The shared secret must match SHARED_SECRET.
6. Configure Clerk with matching keys and AUTH_PROVIDER=clerk. Never commit secret values.
7. Enter practice particulars and banking information in the practice-owned settings.
8. For Sites hosting, set your own project_id in .openai/hosting.json before deployment. The repository intentionally omits hosted identifiers.

No client spreadsheet identifiers, banking defaults or live backend endpoints are included in this source export.

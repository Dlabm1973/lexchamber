# LexChamber Clerk integration

Selected existing application: YOUR_CLERK_APPLICATION_ID. No new Clerk application or test user was created.

The app is a JavaScript Cloudflare Worker, rather than Next.js. The Clerk CLI cannot detect this custom structure. The integration uses the official Clerk JavaScript browser SDK and @clerk/backend, bundled with esbuild.

## Activation

Set runtime values with the hosting service (never commit credentials). A development key pair has been supplied for initial testing; production still requires live keys and domain configuration.

- CLERK_PUBLISHABLE_KEY: production publishable key from the selected application.
- CLERK_SECRET_KEY: matching production secret key.
- AUTH_PROVIDER: clerk, set only when both keys and production domain setup are ready.

Add www.lexchamber.co.za / lexchamber.co.za to the selected application's production configuration as appropriate, including Clerk's required DNS records. Use the custom domain as the canonical authentication origin. Production Clerk domain and redirect configuration must match the deployed hostname. Keys from the development instance are for testing only.

Redeploy the current saved version after setting environment values. Verify public /, /sign-in and /sign-up, successful sign-in, session expiry, sign-out, and denial of unapproved accounts. Until activation, sign-in pages explain that Clerk is being configured and retain the existing approved ChatGPT account login.

## Access and migration

All finance API routes and private assets still require server-side authentication. Clerk mode validates the session with authenticateRequest and checks the verified primary email against ALLOWED_EMAILS. It never falls back to ChatGPT identity in Clerk mode. Missing configuration fails closed.

Registration does not grant access to the owner's Google Sheet. Unapproved accounts receive an access denial. New practices and isolated data stores are outside this change.

There are no application passwords or local user tables to import: existing records are in the same Google Sheet; business IDs are unchanged; the audit actor remains the approved email. Clerk's user ID identifies the authenticated session. Users sign in through the existing selected Clerk application; ChatGPT sessions do not become Clerk sessions. Existing OAuth connections in that Clerk application remain managed there.

Cutover: retain existing access until production keys are configured, then switch AUTH_PROVIDER to clerk and redeploy. Rollback: restore AUTH_PROVIDER to chatgpt and redeploy; keep the allowlist. No records are deleted or migrated during authentication cutover.

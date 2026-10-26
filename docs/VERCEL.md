# Deploy on Vercel

1. Import Dlabm1973/lexchamber in Vercel. Choose Other (not Next.js), repository root, Node.js 22, and retain vercel.json build/output settings.
2. Add CLERK_PUBLISHABLE_KEY (or NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) and CLERK_SECRET_KEY from the same Clerk instance. Never commit keys.
3. Set AUTH_PROVIDER=clerk. For the portable deployment, leave ALLOWED_EMAILS and owner emails empty: each user connects their own backend through onboarding. Add BREVO_API_KEY if enabling shared accounts email.
4. Deploy, then test the landing page, sign-up/sign-in, backend onboarding, trial expiry, Starter/Pro restrictions, PDFs and email. Use test keys only for testing.
5. For production, configure a Clerk production instance and its domain/DNS requirements with live keys. Add your Vercel/custom domain to the relevant Clerk configuration.
6. Assign lexchamber.co.za to Vercel only when ready to move its DNS; do not route the same hostname to two hosts.

All requests route through the server adapter, including private assets. Client source is in client/, rather than Vercel’s automatically served public/ directory, to avoid bypassing authentication. No secret values or client-owned backend identifiers are included. This adapter has been built and checked locally; it has not been deployed to Vercel in this session.

Google Sheets connections are self-service. Live Excel synchronisation and payment processing remain unconnected. Trials and subscriptions use Clerk private metadata. Existing Sites and Vercel deployments can share Clerk records if configured with the same instance, so test against isolated practice data.

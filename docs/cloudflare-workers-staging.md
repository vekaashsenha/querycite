# Cloudflare Workers Staging Deployment

QueryCite production stays on Vercel until the Workers staging deployment is fully validated. Do not change DNS for `querycite.com` or the live Razorpay webhook during this staging phase.

## Architecture

- Runtime: Cloudflare Workers with the OpenNext adapter for Next.js.
- Adapter package: `@opennextjs/cloudflare`.
- Worker config: `wrangler.jsonc`.
- Worker entry: `.open-next/worker.js` generated at build time.
- Static assets binding: `.open-next/assets` via `ASSETS`.
- Node compatibility: `nodejs_compat` enabled for Node-style APIs used by Razorpay signing and framework internals.

## Commands

```bash
pnpm cf:build
pnpm cf:preview
pnpm cf:deploy:staging
```

`cf:deploy:staging` uses `--keep-vars` so dashboard-managed Cloudflare variables and secrets are not removed during deploy.

## Required Cloudflare Variables and Secrets

Set public values as Cloudflare variables and sensitive values as Cloudflare secrets. Build-time variables must also be present in Cloudflare Workers Builds because `NEXT_PUBLIC_*` values are inlined during the Next.js build.

Public/runtime variables:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FEEDBACK_FORM_URL`
- `NEXT_PUBLIC_EXPLAINER_VIDEO_URL` (optional; local video fallback remains available)

Secrets:

- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RESEND_API_KEY`

Server-side variables:

- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `ADMIN_NOTIFICATION_EMAIL`
- `QUERYCITE_ADMIN_EMAILS`
- `GEMINI_MODEL`
- `GEMINI_ADVISOR_MODEL`
- `GEMINI_ADVISOR_FALLBACK_MODEL`
- `GEMINI_FALLBACK_MODEL`
- `RAZORPAY_STARTER_PLAN_ID`
- `RAZORPAY_PRO_PLAN_ID`
- `RAZORPAY_AGENCY_PLAN_ID`

For staging, set `NEXT_PUBLIC_APP_URL` to the Workers staging URL, for example:

```bash
NEXT_PUBLIC_APP_URL=https://querycite-staging.<your-workers-subdomain>.workers.dev
```

## Razorpay Webhook Safety

Current production webhook:

```bash
https://www.querycite.com/api/razorpay/webhook
```

Do not change the production webhook until Workers staging is validated. The Workers route should exist at:

```bash
https://querycite-staging.<your-workers-subdomain>.workers.dev/api/razorpay/webhook
```

Razorpay may allow separate webhook endpoints, but do not test live Razorpay webhooks against staging without explicit approval because it can affect live payment events.

The webhook route currently reads the raw body with `request.text()` before signature verification, which preserves the payload shape needed for Razorpay signature checks.


## Windows Build Note

OpenNext warns that Windows support is not fully guaranteed. This project includes `.npmrc` with `node-linker=hoisted` because the default pnpm symlink layout caused the OpenNext bundle step to hit Windows `Access is denied` errors while traversing generated dependency links.

If local Workers preview still returns a chunk-loading error on Windows, run `pnpm cf:build` and `pnpm cf:deploy:staging` from WSL, Linux, or a Cloudflare/GitHub CI build environment. The standard Next.js build and OpenNext bundle have been validated locally; the remaining local preview issue is specific to Windows workerd/OpenNext chunk loading.

## Staging Checklist Before DNS Cutover

- Homepage loads with the light/off-white marketing surface.
- Explainer video loads from `/videos/querycite-explainer-motion.mp4` or configured public video URL.
- `/pricing` loads and IIMA coupon validation still uses server-side validation.
- `/signup`, `/login`, `/forgot-password`, `/reset-password`, and `/auth/callback` work with staging redirect URLs configured in Supabase.
- Free audit works through `/api/audit`.
- Lead capture and report email flows work if Resend is configured.
- `/report` loads public limited reports.
- `/report?demo=full` loads beta report preview.
- AI Advisor responds with Gemini when `GEMINI_API_KEY` is configured.
- `/dashboard`, `/billing`, `/billing/invoices`, and receipt pages load for authenticated users.
- `/api/razorpay/create-order` creates one-time orders only when env is configured and the user is eligible.
- `/api/razorpay/webhook` accepts POST and rejects invalid signatures.
- Feedback button opens `NEXT_PUBLIC_FEEDBACK_FORM_URL` if configured.
- Static files under `/videos` and Next static chunks load.
- `pnpm lint`, `pnpm build`, and `pnpm cf:build` pass.

## Manual Setup Still Required

1. Create or select the Cloudflare account for QueryCite.
2. Configure the Workers subdomain if it is not already configured.
3. Add the variables and secrets listed above in Cloudflare.
4. Configure Supabase auth redirect URLs for the staging Workers URL:
   - `https://querycite-staging.<your-workers-subdomain>.workers.dev/auth/callback`
   - `https://querycite-staging.<your-workers-subdomain>.workers.dev/reset-password`
   - `https://querycite-staging.<your-workers-subdomain>.workers.dev/login`
   - `https://querycite-staging.<your-workers-subdomain>.workers.dev/dashboard`
5. Deploy with `pnpm cf:deploy:staging`.
6. Complete the staging checklist before changing any DNS records.

# AI Visibility Auditor

A Next.js MVP for QueryCite, an AI Visibility Audit and AEO/GEO fix generator SaaS. The app uses deterministic website checks for audit scoring and Gemini for the private-beta AI Visibility Advisor chat.

## How Codex & GPT-5.6 Were Used

QueryCite was built with heavy support from Codex and GPT-5.6 throughout the product development process.

GPT-5.6 was used for:
- Refining the product idea and positioning
- Turning the concept into a founder-friendly SaaS workflow
- Improving homepage messaging and product copy
- Reviewing UI/UX decisions
- Creating launch content, project story, demo script, and submission assets
- Thinking through pricing, beta access, and user onboarding
- Challenging unclear messaging and reducing technical jargon

Codex was used for:
- Implementing the Next.js and TypeScript application
- Building and debugging product flows
- Connecting Supabase authentication and database flows
- Implementing Razorpay payment and webhook validation
- Improving coupon and subscription access logic
- Creating billing, invoice, and report access flows
- Adding the Gemini-powered AI Advisor experience
- Generating project media planning files and demo assets
- Setting up Cloudflare Workers/OpenNext staging foundation without touching Vercel production

Human oversight:
- All product decisions, positioning, testing, and launch choices were reviewed manually.
- Razorpay payments, webhook behavior, subscription access, billing, invoices, and report unlocking were manually validated.
- Codex and GPT-5.6 were used as build and reasoning partners, not as a replacement for product judgment.

## Built With

- Next.js
- TypeScript
- React
- Supabase
- Gemini
- Razorpay
- Resend
- Vercel
- GitHub
- Codex
- GPT-5.6
- Figma
- Tailwind CSS

## Setup

1. Install dependencies:

```bash
pnpm install
```

2. Create `.env.local` from `.env.example` and add environment variables:

```bash
GEMINI_API_KEY=your_gemini_api_key_here
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
```

Optional model overrides:

```bash
GEMINI_MODEL=gemini-3.5-flash
GEMINI_ADVISOR_MODEL=gemini-3.5-flash
GEMINI_ADVISOR_FALLBACK_MODEL=gemini-3.1-flash-lite
```

Do not commit `.env.local`.

3. Run the app:

```bash
pnpm dev
```

Open `http://localhost:3000`.

## Vercel Environment Variables

Add these in Vercel Project Settings > Environment Variables for Production and Preview:

- `GEMINI_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_STARTER_PLAN_ID`
- `RAZORPAY_PRO_PLAN_ID`
- `RAZORPAY_AGENCY_PLAN_ID`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `EMAIL_REPLY_TO`
- `ADMIN_NOTIFICATION_EMAIL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_FEEDBACK_FORM_URL` (optional Google Form URL for beta feedback CTA)

Never expose `SUPABASE_SERVICE_ROLE_KEY` in client components or browser code.

## Supabase Schema

The schema is in `supabase/schema.sql`.

To apply it:

1. Open the Supabase project.
2. Go to SQL Editor.
3. Paste the contents of `supabase/schema.sql`.
4. Run the script.
5. Confirm RLS is enabled on all QueryCite tables.

The schema prepares profiles, company profiles, competitors, audits, reports, Advisor messages, credit usage, feedback, exports, subscriptions, payments, and Razorpay Test Mode webhook storage.
## Supabase Auth

QueryCite uses Supabase Auth email/password for `/signup`, `/login`, `/forgot-password`, `/reset-password`, `/auth/callback`, and logout. Email confirmation and password recovery should remain enabled in Supabase.

Configured redirect URLs should include:

```bash
https://www.querycite.com/auth/callback
https://www.querycite.com/forgot-password
https://www.querycite.com/reset-password
https://www.querycite.com/login
https://www.querycite.com/dashboard
http://localhost:3000/auth/callback
http://localhost:3000/forgot-password
http://localhost:3000/reset-password
http://localhost:3000/login
http://localhost:3000/dashboard
```

Authenticated users are mapped to `profiles`, previous lead/report rows by matching email, and verified subscription/payment rows by `user_id` or email. Free report links with `reportId` remain viewable without login, but dashboard, profile, billing, competitor management, full downloads, and paid Advisor access require login plus verified paid access. Password reset emails must redirect to `/reset-password` so the app can update the password from the Supabase recovery session.

## What Works Now

- Free no-login URL audit flow.
- URL normalization for domains such as `byldgroup.com`.
- Website-based readiness scoring from real homepage, robots.txt crawler access, llms.txt, schema, content, technical, and trust signals.
- `/report` limited free report with locked full-report sections.
- `/report?demo=full` private beta full-report preview.
- Gemini-powered AI Advisor in beta full-report mode.
- CSV findings export with score category, issue, priority, owner, why it matters, recommended fix, fix type, and category columns.
- Contact/feedback submission to Supabase when Supabase env variables and schema are configured.

## Beta Preview / Coming Soon

- Competitor comparison UI is a beta preview until login, saved competitor setup, and competitor crawling are implemented.
- Supabase email/password login is enabled for dashboard, profile, billing, saved reports, paid competitor setup, and paid Advisor access.
- Limited/free PDF download and CSV findings export work on the report page; share report and email report remain labelled preview/coming soon.
- Dashboard, profile, billing, and saved report history require login. Free saved report links still open limited reports without login.
- Razorpay subscription code is retained for later, while pricing currently uses one-time Test Mode orders until recurring billing is approved.

## Beta Feedback Form

Set `NEXT_PUBLIC_FEEDBACK_FORM_URL` to the public Google Form URL when the beta feedback form is ready. If this variable is missing or still set to `YOUR_GOOGLE_FORM_LINK_HERE`, the in-app feedback CTA is hidden so users never see a broken link.

The suggested Google Form questions and an optional Apps Script generator are documented in `docs/querycite-beta-feedback-form.md`.

## AI Visibility Advisor

The private beta Advisor is available at `/report?demo=full`. The frontend calls `/api/advisor/chat`, and the API route uses `GEMINI_API_KEY` only on the server. The Advisor is scoped to the current report data and only answers questions about the AI Visibility report, AEO/GEO fixes, competitor gaps, content improvements, developer notes, exports, and next steps.


## Razorpay Test Mode

Razorpay is wired for Test Mode only. Pricing currently uses one-time order checkout because recurring subscriptions are not enabled on the merchant account yet. Subscription backend code remains in place for later approval.

Required environment variables for one-time order testing:

```bash
NEXT_PUBLIC_RAZORPAY_KEY_ID=your_razorpay_test_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_test_key_secret_here
RAZORPAY_WEBHOOK_SECRET=your_razorpay_test_webhook_secret_here
NEXT_PUBLIC_APP_URL=https://www.querycite.com
```

Subscription test variables, needed only after recurring billing is enabled:

```bash
RAZORPAY_STARTER_PLAN_ID=your_razorpay_starter_plan_id_here
RAZORPAY_PRO_PLAN_ID=your_razorpay_pro_plan_id_here
RAZORPAY_AGENCY_PLAN_ID=your_razorpay_agency_plan_id_here
```

Webhook URL:

```bash
https://www.querycite.com/api/razorpay/webhook
```

Paid access must be based on verified subscription records in Supabase, not frontend checkout success. One-time test order payments validate checkout, webhook, Supabase payment records, and email flow only; they do not unlock long-term paid subscription access.

To test checkout, open `/pricing`, use a `Start Test Payment` button, complete the Razorpay test order checkout, then confirm the webhook wrote a payment row in Supabase.

## Resend Transactional Email

Required environment variables:

```bash
RESEND_API_KEY=your_resend_api_key_here
EMAIL_FROM=QueryCite <hello@querycite.com>
EMAIL_REPLY_TO=hello@querycite.com
ADMIN_NOTIFICATION_EMAIL=hello@querycite.com
```

Emails are sent for lead capture, feedback, payment success/failure, and subscription status events. Email failures are logged server-side and should not break the audit, lead, feedback, or webhook flows.

Verify email sending by submitting the lead form or contact form with Resend env variables configured, then checking Resend activity and the `email_events` table in Supabase.

## Before Live Payment Launch

- Switch Razorpay keys from Test Mode to Live Mode only after subscription testing is complete.
- Use verified subscription status for full report access.
- Add customer-facing billing management and cancellation flows.
- Finalize billing, refund, and subscription policy pages.
- Confirm webhook retries, email deliverability, and Supabase RLS policies in production.


## Cloudflare Workers Staging

Cloudflare Workers staging support is configured with OpenNext and Wrangler while production remains on Vercel. Do not change DNS or the production Razorpay webhook until the Workers staging deployment is fully validated.

Useful commands:

```bash
pnpm cf:build
pnpm cf:preview
pnpm cf:deploy:staging
```

Local Workers variables can be copied from `.dev.vars.example` into `.dev.vars`. Do not commit `.dev.vars`.

Full setup notes, required Cloudflare secrets, webhook cautions, and the pre-cutover test checklist are in `docs/cloudflare-workers-staging.md`.

## Checks

```bash
pnpm lint
pnpm build
```

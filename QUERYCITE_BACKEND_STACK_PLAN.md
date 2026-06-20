# QueryCite Backend Stack Plan

Product: QueryCite, an AI Visibility Audit and AEO/GEO fix generator SaaS.

Status: Planning only. Do not implement Razorpay, payment, production subscriptions, or full authentication in this phase. Do not expose secrets in frontend code.

## Recommended Architecture

QueryCite should use a free-first backend stack for private beta and the first 10 serious users:

- Next.js App Router for UI and server-side API routes.
- Supabase Auth for work-email signup/login when saved reports and Advisor usage are introduced.
- Supabase Postgres for profiles, companies, competitors, audits, reports, Advisor usage, feedback, exports, and payment placeholders.
- Supabase Storage for future generated PDFs, CSV files, and share assets.
- Supabase Row Level Security for user-owned data access.
- Resend for beta feedback notifications now, and report/renewal emails later.
- Gemini API for AI Visibility Advisor.
- Razorpay Subscriptions later, with webhooks as the source of truth.

Recommended runtime pattern:

- Public free audit can remain no-login and return a limited report immediately.
- Logged-in routes should use the Supabase anon key on the client with RLS-protected queries.
- Server-only operations should use the Supabase service role key inside API routes, server actions, scheduled jobs, or webhook handlers only.
- Gemini and Resend calls should happen server-side only.
- PDF/CSV generation should later write files to Supabase Storage and save metadata in `exports`.

## Environment Variables

Required later:

```bash
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
GEMINI_API_KEY=
```

Rules:

- `SUPABASE_ANON_KEY` can be used in frontend Supabase clients because RLS protects data.
- `SUPABASE_SERVICE_ROLE_KEY` must never be exposed to frontend code, browser bundles, logs, or client components.
- `RESEND_API_KEY` must only be used in server routes/actions.
- `GEMINI_API_KEY` must only be used in server routes/actions.
- Future Razorpay keys should be added only during the payment phase.

## Supabase Tables And Fields

Use `uuid` primary keys and `timestamptz` for dates. Default `created_at` to `now()` and keep `updated_at` on mutable tables.

### profiles

Purpose: Map Supabase Auth users to product identity and company profile.

Fields:

- `id uuid primary key references auth.users(id) on delete cascade`
- `email text not null unique`
- `full_name text`
- `role text default 'owner'`
- `company_profile_id uuid references company_profiles(id)`
- `onboarding_status text default 'not_started'`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Notes:

- Supabase Auth owns passwordless/email-login identity.
- QueryCite profile rows should be created after signup.

### company_profiles

Purpose: Store company/domain context for audits, competitors, and reports.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `owner_user_id uuid not null references auth.users(id) on delete cascade`
- `company_name text`
- `primary_domain text not null`
- `website_url text not null`
- `industry text`
- `audience text`
- `positioning_notes text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Indexes:

- `company_profiles_owner_user_id_idx`
- Optional unique index on `(owner_user_id, primary_domain)`

### competitors

Purpose: Track up to 3 competitors per company/domain.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `company_profile_id uuid not null references company_profiles(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `competitor_name text`
- `competitor_url text not null`
- `domain text not null`
- `slot_number int not null check (slot_number between 1 and 3)`
- `is_active boolean default true`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Constraints and indexes:

- Unique active competitor slot per company: `(company_profile_id, slot_number)` where `is_active = true`.
- Index `competitors_company_profile_id_idx`.
- Index `competitors_user_id_idx`.

### competitor_change_limits

Purpose: Limit competitor changes to 3 times per billing cycle.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `company_profile_id uuid not null references company_profiles(id) on delete cascade`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `billing_cycle_start timestamptz not null`
- `billing_cycle_end timestamptz not null`
- `change_count int default 0 check (change_count >= 0)`
- `change_limit int default 3`
- `reset_date timestamptz not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Access rule:

- Allow competitor updates only when `change_count < change_limit`.
- Reset `change_count` when the billing cycle advances.
- During beta, reset monthly from company creation or first login. Later, align with Razorpay billing cycle.

### audits

Purpose: Store every website scan request and raw audit context.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid references auth.users(id) on delete set null`
- `company_profile_id uuid references company_profiles(id) on delete set null`
- `website_url text not null`
- `normalized_url text not null`
- `final_url text`
- `audit_type text not null default 'free'`
- `status text not null default 'queued'`
- `source text default 'homepage_form'`
- `request_payload jsonb`
- `scraped_snapshot jsonb`
- `error_message text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Audit status values:

- `queued`
- `running`
- `completed`
- `failed`

Audit type values:

- `free`
- `beta_full_preview`
- `paid_full`
- `agency`

### reports

Purpose: Store final report data for free and paid experiences.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `audit_id uuid not null references audits(id) on delete cascade`
- `user_id uuid references auth.users(id) on delete set null`
- `company_profile_id uuid references company_profiles(id) on delete set null`
- `website_url text not null`
- `final_url text`
- `report_type text not null default 'free'`
- `ai_visibility_score int check (ai_visibility_score between 0 and 100)`
- `aeo_score int check (aeo_score between 0 and 100)`
- `geo_score int check (geo_score between 0 and 100)`
- `citation_readiness_score int check (citation_readiness_score between 0 and 100)`
- `content_readiness_score int check (content_readiness_score between 0 and 100)`
- `technical_readiness_score int check (technical_readiness_score between 0 and 100)`
- `findings jsonb not null default '[]'::jsonb`
- `fixes jsonb not null default '[]'::jsonb`
- `developer_notes jsonb not null default '[]'::jsonb`
- `competitor_summary jsonb`
- `advisor_context jsonb`
- `full_report_data jsonb not null default '{}'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Indexes:

- `reports_user_id_created_at_idx`
- `reports_company_profile_id_created_at_idx`
- `reports_audit_id_idx`

Notes:

- Store the normalized current report structure in `full_report_data`.
- Keep scalar score columns for dashboard queries.
- Store free report rows even if `user_id` is null, then attach them if the user saves/claims the report later.

### advisor_messages

Purpose: Store logged-in AI Advisor conversation history.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `company_profile_id uuid references company_profiles(id) on delete cascade`
- `report_id uuid references reports(id) on delete cascade`
- `role text not null check (role in ('user', 'assistant', 'system'))`
- `message text not null`
- `model text`
- `tokens_estimate int`
- `metadata jsonb default '{}'::jsonb`
- `created_at timestamptz default now()`

Indexes:

- `advisor_messages_user_id_created_at_idx`
- `advisor_messages_report_id_created_at_idx`

### advisor_credit_usage

Purpose: Track monthly Advisor credits.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `company_profile_id uuid references company_profiles(id) on delete cascade`
- `plan_name text not null default 'beta'`
- `period_start timestamptz not null`
- `period_end timestamptz not null`
- `credits_limit int not null default 50`
- `credits_used int not null default 0`
- `reset_date timestamptz not null`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Beta default:

- 50 messages/month.

Future plan defaults:

- Free Audit: 0 messages/month.
- Launch Trial: 30 messages/month.
- Starter: 50 messages/month.
- Pro: 200 messages/month.
- Agency: 500 messages/month.

### feedback

Purpose: Capture private beta feedback and contact form submissions.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid references auth.users(id) on delete set null`
- `name text`
- `work_email text not null`
- `company text`
- `website_url text`
- `feedback_type text default 'private_beta'`
- `message text not null`
- `source_page text`
- `status text default 'new'`
- `resend_email_id text`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Resend behavior:

- Store feedback in Supabase first.
- Send a Resend notification to `hello@querycite.com`.
- If Resend fails, keep the feedback row with status `email_failed` and allow retry later.

### exports

Purpose: Track PDF/CSV/share/email exports.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid references auth.users(id) on delete set null`
- `report_id uuid not null references reports(id) on delete cascade`
- `export_type text not null`
- `status text not null default 'queued'`
- `storage_bucket text`
- `storage_path text`
- `public_url text`
- `expires_at timestamptz`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Export type values:

- `limited_pdf`
- `full_pdf`
- `basic_csv`
- `full_csv`
- `share_link`
- `email_report`

### subscriptions

Purpose: Placeholder table for later Razorpay subscription state.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `company_profile_id uuid references company_profiles(id) on delete cascade`
- `plan_name text not null`
- `status text not null default 'placeholder'`
- `provider text default 'razorpay'`
- `provider_customer_id text`
- `provider_subscription_id text`
- `current_period_start timestamptz`
- `current_period_end timestamptz`
- `renewal_date timestamptz`
- `cancel_at_period_end boolean default false`
- `failed_payment_count int default 0`
- `metadata jsonb default '{}'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

Do not use this table to grant production paid access until Razorpay webhooks are implemented.

### payments

Purpose: Placeholder table for future payment events.

Fields:

- `id uuid primary key default gen_random_uuid()`
- `user_id uuid references auth.users(id) on delete set null`
- `subscription_id uuid references subscriptions(id) on delete set null`
- `provider text default 'razorpay'`
- `provider_payment_id text`
- `provider_invoice_id text`
- `amount_cents int`
- `currency text default 'INR'`
- `status text not null default 'placeholder'`
- `event_payload jsonb default '{}'::jsonb`
- `created_at timestamptz default now()`
- `updated_at timestamptz default now()`

## Auth Model

Private beta auth should stay simple:

- Signup/login with work email.
- Start with Supabase magic link or OTP.
- Create a `profiles` row after first login.
- Connect each user to one `company_profiles` row during onboarding.
- Keep the free audit no-login.
- Require login later for saved reports, report history, AI Advisor usage tracking, exports, and dashboard.

Recommended flow:

1. Visitor runs free audit without login.
2. Visitor sees limited report.
3. Visitor clicks save report, use Advisor, or unlock full report preview.
4. App asks for work email login.
5. After login, attach report to `user_id` and `company_profile_id`.
6. Logged-in user sees dashboard and saved report history.

## Competitor Model

Rules:

- Each company/domain can have up to 3 active competitors.
- Competitors are stored in slots 1, 2, and 3.
- Competitor URL must normalize to a valid domain.
- Competitor changes are limited to 3 changes per billing cycle.
- A competitor change means add, replace, deactivate, or reactivate.
- Store current competitors in `competitors`.
- Track cycle usage in `competitor_change_limits`.

Implementation notes:

- In free beta, set a monthly reset window from first login or first company creation.
- Later, align reset date with subscription billing cycle.
- Use a server route or database function to update competitors so the change limit cannot be bypassed from the client.

## Report History

Every audit should create:

- One `audits` row for request, scrape, status, and raw context.
- One `reports` row for scores, findings, fixes, and display-ready report data.
- Optional `exports` rows for generated files later.

Dashboard report list should show:

- Website URL.
- Scan date.
- AI Visibility Score.
- AEO Score.
- GEO Score.
- Report status.
- Report type.
- PDF download status.
- CSV download status.
- Share link status.

Free audits can remain anonymous until the user saves the report. Anonymous rows can be retained short term, then cleaned up with a scheduled job.

## AI Advisor Credits

Credit rules:

- Free Audit: no chat access.
- Private beta default: 50 messages/month.
- Store every user and assistant message in `advisor_messages`.
- Increment `advisor_credit_usage.credits_used` only after a successful Gemini response.
- If Gemini fails, do not consume credit.
- Reset monthly by `reset_date`.

Server-side guardrails:

- Check login before allowing persistent Advisor usage.
- Check `credits_used < credits_limit`.
- Load current report context by `report_id`.
- Send only the necessary report context to Gemini.
- Store the user message, assistant response, model, and basic metadata.

## Feedback Capture With Resend

Initial endpoint:

- `POST /api/feedback`

Input:

- name
- work email
- company
- website URL
- feedback type
- message
- source page

Flow:

1. Validate required fields server-side.
2. Insert feedback row into Supabase.
3. Send notification email through Resend to `hello@querycite.com`.
4. Store `resend_email_id` when successful.
5. If email fails, update status to `email_failed`.
6. Return a clean success message if feedback was saved, even if notification email needs retry.

Future emails through Resend:

- Beta welcome.
- Report ready.
- Feedback received.
- Advisor credit warning.
- Renewal reminders after Razorpay is implemented.
- Payment failed after Razorpay is implemented.

## Row Level Security Notes

Enable RLS on every app table:

- `profiles`
- `company_profiles`
- `competitors`
- `competitor_change_limits`
- `audits`
- `reports`
- `advisor_messages`
- `advisor_credit_usage`
- `feedback`
- `exports`
- `subscriptions`
- `payments`

Recommended policies:

- Users can select/update only their own `profiles` row.
- Users can select/update company profiles where `owner_user_id = auth.uid()`.
- Users can select competitors where `user_id = auth.uid()` or the related company belongs to them.
- Users can select audits and reports where `user_id = auth.uid()`.
- Users can select Advisor messages where `user_id = auth.uid()`.
- Users can select Advisor credit rows where `user_id = auth.uid()`.
- Users can insert feedback anonymously, but only select their own feedback if logged in.
- Users can select exports where `user_id = auth.uid()` or the report belongs to them.
- Users can select subscription/payment placeholders only for their own user ID.

Service role use cases:

- Feedback notification retries.
- Razorpay webhook writes later.
- Scheduled cleanup of anonymous audits.
- Monthly credit resets if not handled by a database job.
- Storage object generation.

Never use service role from:

- Client components.
- Browser-side Supabase client.
- Public JavaScript bundles.
- Local storage.

## Free-First Cost Control

For the first 10 serious users:

- Keep free audit limited and avoid storing large raw HTML permanently.
- Store only cleaned scrape snapshots and final report JSON.
- Cap Advisor message length and response length.
- Use Gemini Flash for beta Advisor responses.
- Track Advisor credits monthly.
- Avoid generating PDF files until requested.
- Generate CSV client-side or server-side only when clicked.
- Use Supabase Storage only for saved exports, not every report view.
- Send only necessary beta emails through Resend.
- Avoid background jobs until usage justifies them.

Upgrade triggers:

- Supabase upgrade when database size, storage, auth usage, or egress approaches free-tier limits.
- Resend upgrade when beta/report emails approach free-tier sending limits or need a verified/custom sending domain at scale.
- Gemini budget review when Advisor usage exceeds 10 beta users or credit use becomes unpredictable.
- Move anonymous audit cleanup to scheduled jobs once audit volume grows.
- Add queueing if audit scans or exports become slow.
- Add Razorpay only when pricing, refund policy, and subscription access rules are finalized.

## Implementation Phases

### Phase A: Supabase Project And Schema

- Create Supabase project.
- Add tables, indexes, and constraints.
- Enable RLS.
- Add initial policies.
- Add environment variables locally and in Vercel.
- Keep current no-login audit working.

### Phase B: Feedback Storage And Resend Notification

- Create `/api/feedback`.
- Store contact/beta feedback in Supabase.
- Send Resend email to `hello@querycite.com`.
- Show clean success/error UI.
- Keep mailto fallback if Resend fails.

### Phase C: Auth And Profiles

- Add Supabase Auth with work email.
- Create profile after signup.
- Create or connect company profile during onboarding.
- Keep no-login free audit available.

### Phase D: Saved Reports And Dashboard

- Save audits and reports.
- Add dashboard report list.
- Add report detail page from database.
- Attach anonymous report to logged-in user when saved.

### Phase E: Advisor Credit Tracking

- Require login for persistent Advisor usage.
- Store Advisor messages.
- Enforce beta 50 messages/month.
- Add monthly reset logic.
- Keep Gemini key server-side only.

### Phase F: Exports Foundation

- Store export metadata.
- Generate CSV on demand.
- Add PDF generation later.
- Store files in Supabase Storage only when generated.

### Phase G: Subscription Placeholders

- Add subscription/payment placeholder reads in dashboard.
- Do not grant paid access from placeholders yet.
- Prepare for Razorpay webhook mapping later.

### Phase H: Razorpay Later

- Implement Razorpay test subscriptions.
- Add webhook route.
- Verify webhook signatures.
- Update `subscriptions` and `payments` from webhooks only.
- Gate paid access from active subscription state.

## Open Questions

- Should private beta require login immediately for AI Advisor, or allow temporary demo access with local-state credits?
- What email domain should Resend use first: default sandbox sender or a verified QueryCite domain?
- How long should anonymous free audit reports be retained before cleanup?
- Should agencies have one company profile per client or one agency account with multiple client companies?
- Should competitor changes reset monthly during beta or only after real billing cycles exist?
- What fields should be mandatory in company onboarding: company name, domain, industry, audience, competitors?
- Should saved reports be editable with notes, or immutable snapshots?
- Should report share links be public, password-protected, or email-gated?

## Files That May Need Changes Later

- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/app/api/feedback/route.ts`
- `src/app/api/audit/route.ts`
- `src/app/api/advisor/chat/route.ts`
- `src/app/dashboard/page.tsx`
- `src/app/report/[reportId]/page.tsx`
- `src/components/ContactForm.tsx`
- `src/components/AdvisorChat.tsx`
- `src/components/ReportExperience.tsx`
- `src/lib/audit-report.ts`
- Future Supabase SQL migration files under `supabase/migrations`.

## Recommended Next Build Task

Build Phase B first: Supabase feedback capture with Resend notification and mailto fallback. It gives QueryCite a useful private-beta feedback loop with low risk, low cost, and no payment/auth complexity.
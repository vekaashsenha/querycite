-- QueryCite Supabase schema for private beta backend foundation.
-- Run this in the Supabase SQL Editor for the project connected to QueryCite.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create table if not exists public.company_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  company_name text,
  primary_domain text not null,
  website_url text not null,
  industry text,
  business_type text,
  primary_market text,
  company_description text,
  primary_product_service text,
  icp_customer_type text,
  positioning_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'user',
  company_profile_id uuid references public.company_profiles(id) on delete set null,
  onboarding_status text not null default 'not_started',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'company_profiles_owner_domain_unique'
      and conrelid = 'public.company_profiles'::regclass
  )
  and not exists (
    select 1
    from pg_class
    where relname = 'company_profiles_owner_domain_unique'
      and relnamespace = 'public'::regnamespace
  ) then
    alter table public.company_profiles
      add constraint company_profiles_owner_domain_unique unique (owner_user_id, primary_domain);
  end if;
end;
$$;

create table if not exists public.competitors (
  id uuid primary key default gen_random_uuid(),
  company_profile_id uuid not null references public.company_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  competitor_name text,
  competitor_url text not null,
  domain text not null,
  competitor_type text not null default 'Direct' check (competitor_type in ('Direct', 'Indirect', 'Aspirational')),
  slot_number int not null check (slot_number between 1 and 3),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists competitors_active_slot_unique
  on public.competitors(company_profile_id, slot_number)
  where is_active = true;

create table if not exists public.competitor_change_limits (
  id uuid primary key default gen_random_uuid(),
  company_profile_id uuid not null references public.company_profiles(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  billing_cycle_start timestamptz not null,
  billing_cycle_end timestamptz not null,
  change_count int not null default 0 check (change_count >= 0),
  change_limit int not null default 3,
  reset_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  company_profile_id uuid references public.company_profiles(id) on delete set null,
  website_url text not null,
  normalized_url text not null,
  final_url text,
  audit_type text not null default 'free' check (audit_type in ('free', 'beta_full_preview', 'paid_full', 'agency')),
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  source text default 'homepage_form',
  request_payload jsonb,
  scraped_snapshot jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references public.audits(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  company_profile_id uuid references public.company_profiles(id) on delete set null,
  website_url text not null,
  final_url text,
  report_type text not null default 'free' check (report_type in ('free', 'beta_full_preview', 'paid_full', 'agency')),
  ai_visibility_score int check (ai_visibility_score between 0 and 100),
  aeo_score int check (aeo_score between 0 and 100),
  geo_score int check (geo_score between 0 and 100),
  ai_crawler_readiness_score int check (ai_crawler_readiness_score between 0 and 100),
  citation_readiness_score int check (citation_readiness_score between 0 and 100),
  content_readiness_score int check (content_readiness_score between 0 and 100),
  technical_readiness_score int check (technical_readiness_score between 0 and 100),
  findings jsonb not null default '[]'::jsonb,
  fixes jsonb not null default '[]'::jsonb,
  developer_notes jsonb not null default '[]'::jsonb,
  competitor_summary jsonb,
  advisor_context jsonb,
  full_report_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.advisor_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_profile_id uuid references public.company_profiles(id) on delete cascade,
  report_id uuid references public.reports(id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  message text not null,
  model text,
  tokens_estimate int,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.advisor_credit_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  company_profile_id uuid references public.company_profiles(id) on delete cascade,
  plan_name text not null default 'private_beta',
  period_start timestamptz not null,
  period_end timestamptz not null,
  credits_limit int not null default 50,
  credits_used int not null default 0 check (credits_used >= 0),
  reset_date timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  name text,
  work_email text not null,
  company text,
  website_url text,
  feedback_type text not null default 'private_beta',
  message text not null,
  source_page text,
  status text not null default 'new' check (status in ('new', 'received', 'email_failed', 'resolved')),
  resend_email_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  company_name text,
  role text,
  website_url text not null,
  audit_url text,
  source text not null default 'free_audit_gate',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  privacy_terms_accepted boolean not null default false,
  marketing_consent boolean not null default false,
  consent_timestamp timestamptz not null,
  user_agent text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  report_id uuid not null references public.reports(id) on delete cascade,
  export_type text not null check (export_type in ('limited_pdf', 'full_pdf', 'basic_csv', 'full_csv', 'share_link', 'email_report')),
  status text not null default 'queued' check (status in ('queued', 'ready', 'failed', 'preview')),
  storage_bucket text,
  storage_path text,
  public_url text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  company_profile_id uuid references public.company_profiles(id) on delete cascade,
  plan_name text not null,
  status text not null default 'placeholder',
  provider text not null default 'razorpay',
  provider_customer_id text,
  provider_subscription_id text,
  current_period_start timestamptz,
  current_period_end timestamptz,
  renewal_date timestamptz,
  cancel_at_period_end boolean not null default false,
  failed_payment_count int not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  subscription_id uuid references public.subscriptions(id) on delete set null,
  provider text not null default 'razorpay',
  provider_payment_id text,
  provider_invoice_id text,
  amount_cents int,
  currency text not null default 'INR',
  status text not null default 'placeholder',
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- Paid SaaS foundation additions for private beta.
-- Auth account mapping additions.
alter table public.profiles add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles alter column role set default 'user';
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'user' where role is null or role not in ('user', 'admin');
alter table public.profiles alter column role set not null;
update public.profiles set user_id = id where user_id is null;
update public.profiles set name = full_name where name is null and full_name is not null;
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_role_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_role_check check (role in ('user', 'admin'));
  end if;
end;
$$;
alter table public.leads add column if not exists user_id uuid references auth.users(id) on delete set null;
alter table public.company_profiles alter column owner_user_id drop not null;
alter table public.company_profiles add column if not exists email text;
alter table public.company_profiles add column if not exists subscription_id text;
alter table public.company_profiles add column if not exists contact_name text;
alter table public.company_profiles add column if not exists role_designation text;
alter table public.company_profiles add column if not exists company_size text;
alter table public.company_profiles add column if not exists target_audience text;
alter table public.company_profiles add column if not exists main_keywords text;
alter table public.company_profiles add column if not exists primary_geography text;
alter table public.company_profiles add column if not exists tone_of_voice text;

alter table public.competitors alter column user_id drop not null;
alter table public.competitors add column if not exists email text;
alter table public.competitors add column if not exists subscription_id text;

alter table public.competitor_change_limits alter column user_id drop not null;
alter table public.competitor_change_limits add column if not exists email text;
alter table public.competitor_change_limits add column if not exists subscription_id text;

alter table public.leads add column if not exists report_id uuid references public.reports(id) on delete set null;

alter table public.advisor_credit_usage alter column user_id drop not null;
alter table public.advisor_credit_usage add column if not exists email text;
alter table public.advisor_credit_usage add column if not exists subscription_id text;
alter table public.advisor_credit_usage add column if not exists report_id uuid references public.reports(id) on delete set null;
alter table public.advisor_credit_usage add column if not exists advisor_credits_limit int not null default 0;
alter table public.advisor_credit_usage add column if not exists advisor_credits_used int not null default 0;
alter table public.advisor_credit_usage add column if not exists blog_briefs_limit int not null default 0;
alter table public.advisor_credit_usage add column if not exists blog_briefs_used int not null default 0;
alter table public.advisor_credit_usage add column if not exists fix_packs_limit int not null default 0;
alter table public.advisor_credit_usage add column if not exists fix_packs_used int not null default 0;
alter table public.advisor_credit_usage add column if not exists competitor_advice_limit int not null default 0;
alter table public.advisor_credit_usage add column if not exists competitor_advice_used int not null default 0;
-- Razorpay test-mode and transactional email additions.
alter table public.subscriptions alter column user_id drop not null;
alter table public.subscriptions add column if not exists email text;
alter table public.subscriptions add column if not exists product text not null default 'querycite';
alter table public.subscriptions add column if not exists razorpay_customer_id text;
alter table public.subscriptions add column if not exists razorpay_subscription_id text;
alter table public.subscriptions add column if not exists paid_access boolean not null default false;
alter table public.subscriptions add column if not exists next_billing_date timestamptz;
alter table public.subscriptions add column if not exists website_url text;
alter table public.subscriptions add column if not exists raw_event jsonb;

alter table public.payments add column if not exists email text;
alter table public.payments add column if not exists product text not null default 'querycite';
alter table public.payments add column if not exists razorpay_customer_id text;
alter table public.payments add column if not exists razorpay_subscription_id text;
alter table public.payments add column if not exists razorpay_payment_id text;
alter table public.payments add column if not exists razorpay_order_id text;
alter table public.payments add column if not exists payment_type text;
alter table public.payments add column if not exists plan_name text;
alter table public.payments add column if not exists amount int;
alter table public.payments add column if not exists raw_event jsonb;

alter table public.subscriptions add column if not exists razorpay_order_id text;
alter table public.subscriptions add column if not exists payment_type text;
alter table public.subscriptions add column if not exists coupon_code text;
alter table public.subscriptions add column if not exists amount_paise integer;
alter table public.subscriptions add column if not exists currency text not null default 'INR';
alter table public.subscriptions add column if not exists access_starts_at timestamptz;
alter table public.subscriptions add column if not exists access_ends_at timestamptz;
alter table public.subscriptions add column if not exists company_name text;
alter table public.subscriptions add column if not exists plan text;
alter table public.subscriptions add column if not exists trial_started_at timestamptz;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.subscriptions add column if not exists cancelled_at timestamptz;

alter table public.payments add column if not exists amount_paise integer;
alter table public.payments add column if not exists coupon_code text;
alter table public.payments add column if not exists access_starts_at timestamptz;
alter table public.payments add column if not exists access_ends_at timestamptz;

create table if not exists public.coupon_codes (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  description text,
  final_amount_paise integer not null,
  currency text default 'INR',
  max_redemptions integer default 100,
  redeemed_count integer default 0,
  is_active boolean default true,
  expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.coupon_codes alter column max_redemptions set default 100;

create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid references public.coupon_codes(id),
  code text not null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  razorpay_payment_id text,
  razorpay_order_id text,
  amount_paise integer not null,
  currency text default 'INR',
  status text not null default 'pending',
  redeemed_at timestamptz,
  created_at timestamptz default now()
);

insert into public.coupon_codes (code, description, final_amount_paise, currency, max_redemptions, is_active)
values
  ('IIMA-AGMP18', U&'Exclusive IIMA Beta Offer: \20B9199 for 1-month paid beta access', 19900, 'INR', 100, true),
  ('IIMA-DMBPT02', U&'Exclusive IIMA Beta Offer: \20B9199 for 1-month paid beta access', 19900, 'INR', 100, true)
on conflict (code) do update set
  description = excluded.description,
  final_amount_paise = excluded.final_amount_paise,
  currency = excluded.currency,
  max_redemptions = excluded.max_redemptions,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.email_events (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  email_type text not null,
  subject text not null,
  status text not null,
  provider_message_id text,
  error_message text,
  related_entity_type text,
  related_entity_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_user_id_unique on public.profiles(user_id) where user_id is not null;
create index if not exists profiles_email_idx on public.profiles(email);
create index if not exists profiles_role_idx on public.profiles(role);
create index if not exists leads_user_id_idx on public.leads(user_id);
create index if not exists company_profiles_owner_user_id_idx on public.company_profiles(owner_user_id);
create index if not exists company_profiles_subscription_id_idx on public.company_profiles(subscription_id);
create index if not exists company_profiles_email_idx on public.company_profiles(email);
create index if not exists competitors_company_profile_id_idx on public.competitors(company_profile_id);
create index if not exists competitors_user_id_idx on public.competitors(user_id);
create index if not exists competitors_subscription_id_idx on public.competitors(subscription_id);
create index if not exists competitor_change_limits_user_id_idx on public.competitor_change_limits(user_id);
create index if not exists competitor_change_limits_subscription_id_idx on public.competitor_change_limits(subscription_id);
create index if not exists audits_user_id_created_at_idx on public.audits(user_id, created_at desc);
create index if not exists reports_user_id_created_at_idx on public.reports(user_id, created_at desc);
create index if not exists reports_company_profile_id_created_at_idx on public.reports(company_profile_id, created_at desc);
create index if not exists advisor_messages_user_id_created_at_idx on public.advisor_messages(user_id, created_at desc);
create index if not exists advisor_messages_report_id_created_at_idx on public.advisor_messages(report_id, created_at desc);
create index if not exists advisor_credit_usage_user_id_idx on public.advisor_credit_usage(user_id);
create index if not exists advisor_credit_usage_subscription_id_idx on public.advisor_credit_usage(subscription_id);
create index if not exists feedback_work_email_idx on public.feedback(work_email);
create index if not exists leads_email_idx on public.leads(email);
create index if not exists leads_website_url_idx on public.leads(website_url);
create index if not exists leads_created_at_idx on public.leads(created_at desc);
create index if not exists exports_user_id_created_at_idx on public.exports(user_id, created_at desc);
create index if not exists subscriptions_user_id_idx on public.subscriptions(user_id);
create index if not exists payments_user_id_idx on public.payments(user_id);
create index if not exists subscriptions_razorpay_subscription_id_idx on public.subscriptions(razorpay_subscription_id);
create index if not exists subscriptions_email_idx on public.subscriptions(email);
create index if not exists subscriptions_paid_access_idx on public.subscriptions(paid_access);
create index if not exists payments_razorpay_payment_id_idx on public.payments(razorpay_payment_id);
create index if not exists payments_razorpay_subscription_id_idx on public.payments(razorpay_subscription_id);
create index if not exists payments_razorpay_order_id_idx on public.payments(razorpay_order_id);
create index if not exists payments_payment_type_idx on public.payments(payment_type);
create index if not exists payments_email_idx on public.payments(email);
create index if not exists subscriptions_razorpay_order_id_idx on public.subscriptions(razorpay_order_id);
create index if not exists subscriptions_payment_type_idx on public.subscriptions(payment_type);
create index if not exists subscriptions_coupon_code_idx on public.subscriptions(coupon_code);
create index if not exists subscriptions_access_ends_at_idx on public.subscriptions(access_ends_at);
create index if not exists payments_coupon_code_idx on public.payments(coupon_code);
create index if not exists payments_access_ends_at_idx on public.payments(access_ends_at);
create index if not exists coupon_codes_code_idx on public.coupon_codes(code);
create index if not exists coupon_codes_active_idx on public.coupon_codes(is_active);
create index if not exists coupon_redemptions_code_idx on public.coupon_redemptions(code);
create index if not exists coupon_redemptions_coupon_id_idx on public.coupon_redemptions(coupon_id);
create index if not exists coupon_redemptions_user_id_idx on public.coupon_redemptions(user_id);
create index if not exists coupon_redemptions_email_idx on public.coupon_redemptions(email);
create unique index if not exists coupon_redemptions_payment_unique on public.coupon_redemptions(razorpay_payment_id) where razorpay_payment_id is not null;
create index if not exists email_events_recipient_email_idx on public.email_events(recipient_email);
create index if not exists email_events_created_at_idx on public.email_events(created_at desc);

drop trigger if exists set_company_profiles_updated_at on public.company_profiles;
create trigger set_company_profiles_updated_at before update on public.company_profiles for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();

drop trigger if exists set_competitors_updated_at on public.competitors;
create trigger set_competitors_updated_at before update on public.competitors for each row execute function public.set_updated_at();

drop trigger if exists set_competitor_change_limits_updated_at on public.competitor_change_limits;
create trigger set_competitor_change_limits_updated_at before update on public.competitor_change_limits for each row execute function public.set_updated_at();

drop trigger if exists set_audits_updated_at on public.audits;
create trigger set_audits_updated_at before update on public.audits for each row execute function public.set_updated_at();

drop trigger if exists set_reports_updated_at on public.reports;
create trigger set_reports_updated_at before update on public.reports for each row execute function public.set_updated_at();

drop trigger if exists set_advisor_credit_usage_updated_at on public.advisor_credit_usage;
create trigger set_advisor_credit_usage_updated_at before update on public.advisor_credit_usage for each row execute function public.set_updated_at();

drop trigger if exists set_feedback_updated_at on public.feedback;
create trigger set_feedback_updated_at before update on public.feedback for each row execute function public.set_updated_at();

drop trigger if exists set_leads_updated_at on public.leads;
create trigger set_leads_updated_at before update on public.leads for each row execute function public.set_updated_at();

drop trigger if exists set_exports_updated_at on public.exports;
create trigger set_exports_updated_at before update on public.exports for each row execute function public.set_updated_at();

drop trigger if exists set_subscriptions_updated_at on public.subscriptions;
create trigger set_subscriptions_updated_at before update on public.subscriptions for each row execute function public.set_updated_at();

drop trigger if exists set_payments_updated_at on public.payments;
create trigger set_payments_updated_at before update on public.payments for each row execute function public.set_updated_at();

drop trigger if exists set_coupon_codes_updated_at on public.coupon_codes;
create trigger set_coupon_codes_updated_at before update on public.coupon_codes for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.company_profiles enable row level security;
alter table public.competitors enable row level security;
alter table public.competitor_change_limits enable row level security;
alter table public.audits enable row level security;
alter table public.reports enable row level security;
alter table public.advisor_messages enable row level security;
alter table public.advisor_credit_usage enable row level security;
alter table public.feedback enable row level security;
alter table public.leads enable row level security;
alter table public.exports enable row level security;
alter table public.subscriptions enable row level security;
alter table public.payments enable row level security;
alter table public.email_events enable row level security;
alter table public.coupon_codes enable row level security;
alter table public.coupon_redemptions enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles for select using (id = auth.uid() or user_id = auth.uid());
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles for update using (id = auth.uid() or user_id = auth.uid()) with check (id = auth.uid() or user_id = auth.uid());
drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles for insert with check (id = auth.uid() or user_id = auth.uid());

drop policy if exists "company_profiles_select_own" on public.company_profiles;
create policy "company_profiles_select_own" on public.company_profiles for select using (owner_user_id = auth.uid());
drop policy if exists "company_profiles_insert_own" on public.company_profiles;
create policy "company_profiles_insert_own" on public.company_profiles for insert with check (owner_user_id = auth.uid());
drop policy if exists "company_profiles_update_own" on public.company_profiles;
create policy "company_profiles_update_own" on public.company_profiles for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists "competitors_select_own" on public.competitors;
create policy "competitors_select_own" on public.competitors for select using (user_id = auth.uid());
drop policy if exists "competitors_insert_own" on public.competitors;
create policy "competitors_insert_own" on public.competitors for insert with check (user_id = auth.uid());
drop policy if exists "competitors_update_own" on public.competitors;
create policy "competitors_update_own" on public.competitors for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "competitor_limits_select_own" on public.competitor_change_limits;
create policy "competitor_limits_select_own" on public.competitor_change_limits for select using (user_id = auth.uid());
drop policy if exists "competitor_limits_insert_own" on public.competitor_change_limits;
create policy "competitor_limits_insert_own" on public.competitor_change_limits for insert with check (user_id = auth.uid());
drop policy if exists "competitor_limits_update_own" on public.competitor_change_limits;
create policy "competitor_limits_update_own" on public.competitor_change_limits for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "audits_select_own" on public.audits;
create policy "audits_select_own" on public.audits for select using (user_id = auth.uid());
drop policy if exists "audits_insert_own_or_anonymous" on public.audits;
create policy "audits_insert_own_or_anonymous" on public.audits for insert with check (user_id = auth.uid() or user_id is null);
drop policy if exists "audits_update_own" on public.audits;
create policy "audits_update_own" on public.audits for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own" on public.reports for select using (user_id = auth.uid());
drop policy if exists "reports_insert_own_or_anonymous" on public.reports;
create policy "reports_insert_own_or_anonymous" on public.reports for insert with check (user_id = auth.uid() or user_id is null);
drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own" on public.reports for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "advisor_messages_select_own" on public.advisor_messages;
create policy "advisor_messages_select_own" on public.advisor_messages for select using (user_id = auth.uid());
drop policy if exists "advisor_messages_insert_own" on public.advisor_messages;
create policy "advisor_messages_insert_own" on public.advisor_messages for insert with check (user_id = auth.uid());

drop policy if exists "advisor_credit_usage_select_own" on public.advisor_credit_usage;
create policy "advisor_credit_usage_select_own" on public.advisor_credit_usage for select using (user_id = auth.uid());
drop policy if exists "advisor_credit_usage_insert_own" on public.advisor_credit_usage;
create policy "advisor_credit_usage_insert_own" on public.advisor_credit_usage for insert with check (user_id = auth.uid());
drop policy if exists "advisor_credit_usage_update_own" on public.advisor_credit_usage;
create policy "advisor_credit_usage_update_own" on public.advisor_credit_usage for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "feedback_insert_anyone" on public.feedback;
create policy "feedback_insert_anyone" on public.feedback for insert with check (true);
drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own" on public.feedback for select using (user_id = auth.uid() or work_email = auth.email());
-- Leads are inserted server-side with the Supabase service role, which bypasses RLS. Do not expose the service role key to the browser.

drop policy if exists "exports_select_own" on public.exports;
create policy "exports_select_own" on public.exports for select using (user_id = auth.uid());
drop policy if exists "exports_insert_own" on public.exports;
create policy "exports_insert_own" on public.exports for insert with check (user_id = auth.uid());

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions for select using (user_id = auth.uid());
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own" on public.payments for select using (user_id = auth.uid());
drop policy if exists "coupon_redemptions_select_own" on public.coupon_redemptions;
create policy "coupon_redemptions_select_own" on public.coupon_redemptions for select using (user_id = auth.uid() or email = auth.email());
-- Coupon codes and redemption writes are handled server-side with the Supabase service role.
-- Email events are inserted server-side with the Supabase service role, which bypasses RLS.

-- Supabase service role bypasses RLS by design and should only be used server-side.

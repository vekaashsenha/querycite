-- QueryCite First 20 Companies - 30-Day Pro Trial foundation.
-- Safe to run more than once. Does not drop or reset user data.

alter table public.subscriptions add column if not exists company_name text;
alter table public.subscriptions add column if not exists plan text;
alter table public.subscriptions add column if not exists trial_started_at timestamptz;
alter table public.subscriptions add column if not exists trial_ends_at timestamptz;
alter table public.subscriptions add column if not exists cancelled_at timestamptz;
alter table public.subscriptions add column if not exists payment_type text;
alter table public.subscriptions add column if not exists access_starts_at timestamptz;
alter table public.subscriptions add column if not exists access_ends_at timestamptz;
alter table public.subscriptions add column if not exists razorpay_customer_id text;
alter table public.subscriptions add column if not exists razorpay_subscription_id text;
alter table public.subscriptions add column if not exists paid_access boolean not null default false;
alter table public.subscriptions add column if not exists raw_event jsonb;

create table if not exists public.pro_trial_allocations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  company_name text not null,
  plan text not null default 'pro',
  status text not null default 'trial_pending_authorization',
  trial_started_at timestamptz,
  trial_ends_at timestamptz,
  razorpay_customer_id text,
  razorpay_subscription_id text,
  cancel_at_period_end boolean not null default false,
  cancelled_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pro_trial_allocations_status_check'
      and conrelid = 'public.pro_trial_allocations'::regclass
  ) then
    alter table public.pro_trial_allocations
      add constraint pro_trial_allocations_status_check
      check (status in ('trial_pending_authorization', 'trialing', 'active', 'cancelled', 'expired', 'payment_failed'));
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'pro_trial_allocations_plan_check'
      and conrelid = 'public.pro_trial_allocations'::regclass
  ) then
    alter table public.pro_trial_allocations
      add constraint pro_trial_allocations_plan_check check (plan = 'pro');
  end if;
end;
$$;

create unique index if not exists pro_trial_allocations_user_unique on public.pro_trial_allocations(user_id);
create unique index if not exists pro_trial_allocations_subscription_unique on public.pro_trial_allocations(razorpay_subscription_id) where razorpay_subscription_id is not null;
create index if not exists pro_trial_allocations_status_idx on public.pro_trial_allocations(status);
create index if not exists pro_trial_allocations_email_idx on public.pro_trial_allocations(email);
create index if not exists subscriptions_payment_type_idx on public.subscriptions(payment_type);
create index if not exists subscriptions_trial_ends_at_idx on public.subscriptions(trial_ends_at);
create index if not exists subscriptions_razorpay_subscription_id_idx on public.subscriptions(razorpay_subscription_id);

alter table public.pro_trial_allocations enable row level security;

drop policy if exists "pro_trial_allocations_select_own" on public.pro_trial_allocations;
create policy "pro_trial_allocations_select_own"
  on public.pro_trial_allocations
  for select
  using (user_id = auth.uid() or email = auth.email());

-- Writes are performed server-side with SUPABASE_SERVICE_ROLE_KEY.
drop policy if exists "pro_trial_allocations_no_client_insert" on public.pro_trial_allocations;
create policy "pro_trial_allocations_no_client_insert"
  on public.pro_trial_allocations
  for insert
  with check (false);

drop policy if exists "pro_trial_allocations_no_client_update" on public.pro_trial_allocations;
create policy "pro_trial_allocations_no_client_update"
  on public.pro_trial_allocations
  for update
  using (false)
  with check (false);

create or replace function public.claim_first_20_pro_trial(
  p_user_id uuid,
  p_email text,
  p_company_name text
)
returns table(allocation_id uuid, allocated boolean, reason text)
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id uuid;
  new_id uuid;
  active_count integer;
begin
  perform pg_advisory_xact_lock(hashtext('querycite_first_20_pro_trial'));

  select id into existing_id
  from public.pro_trial_allocations
  where user_id = p_user_id
  limit 1;

  if existing_id is not null then
    allocation_id := existing_id;
    allocated := false;
    reason := 'already_claimed';
    return next;
    return;
  end if;

  select count(*) into active_count
  from public.pro_trial_allocations
  where status in ('trial_pending_authorization', 'trialing', 'active', 'cancelled', 'expired', 'payment_failed');

  if active_count >= 20 then
    allocation_id := null;
    allocated := false;
    reason := 'offer_full';
    return next;
    return;
  end if;

  insert into public.pro_trial_allocations(user_id, email, company_name, plan, status, created_at, updated_at)
  values (p_user_id, lower(trim(p_email)), nullif(trim(p_company_name), ''), 'pro', 'trial_pending_authorization', now(), now())
  returning id into new_id;

  allocation_id := new_id;
  allocated := true;
  reason := 'allocated';
  return next;
end;
$$;

grant execute on function public.claim_first_20_pro_trial(uuid, text, text) to service_role;

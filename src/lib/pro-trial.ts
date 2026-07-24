import { callSupabaseRpc, insertSupabaseRow, isSupabaseAdminConfigured, selectSupabaseRows, updateSupabaseRows } from "@/lib/supabase/admin";
import type { QueryCiteUser } from "@/lib/auth/server";

export const FIRST_20_PRO_TRIAL_DAYS = 30;
export const FIRST_20_PRO_TRIAL_LIMIT = 20;
export const FIRST_20_PRO_TRIAL_PAYMENT_TYPE = "first_20_pro_trial";

export type ProTrialStatus = "trial_pending_authorization" | "trialing" | "active" | "cancelled" | "expired" | "payment_failed";

type TrialAllocationRow = {
  id?: string | null;
  user_id?: string | null;
  email?: string | null;
  company_name?: string | null;
  plan?: string | null;
  status?: ProTrialStatus | string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  access_starts_at?: string | null;
  access_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  renewal_date?: string | null;
  next_billing_date?: string | null;
  razorpay_customer_id?: string | null;
  razorpay_subscription_id?: string | null;
  cancel_at_period_end?: boolean | null;
  cancelled_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

type SubscriptionTrialRow = {
  id?: string | null;
  user_id?: string | null;
  email?: string | null;
  plan_name?: string | null;
  company_name?: string | null;
  status?: string | null;
  payment_type?: string | null;
  paid_access?: boolean | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  access_starts_at?: string | null;
  access_ends_at?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  renewal_date?: string | null;
  next_billing_date?: string | null;
  razorpay_customer_id?: string | null;
  razorpay_subscription_id?: string | null;
  cancel_at_period_end?: boolean | null;
  cancelled_at?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type ProTrialStatusView = {
  configured: boolean;
  hasAllocation: boolean;
  allocationId: string | null;
  companyName: string | null;
  plan: "pro";
  status: ProTrialStatus | "unavailable" | "not_claimed";
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  remainingDays: number | null;
  renewalDate: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  razorpaySubscriptionId: string | null;
  proAccessAllowed: boolean;
  slotsLimit: number;
};

type ClaimTrialRpcRow = {
  allocation_id?: string | null;
  allocated?: boolean | null;
  reason?: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

export function trialEndFrom(start = new Date()) {
  const end = new Date(start);
  end.setDate(end.getDate() + FIRST_20_PRO_TRIAL_DAYS);
  return end.toISOString();
}

export function secondsFromIso(value: string) {
  return Math.floor(Date.parse(value) / 1000);
}

function remainingDays(end: string | null | undefined) {
  if (!end) return null;
  const ms = Date.parse(end) - Date.now();
  if (Number.isNaN(ms)) return null;
  return Math.max(0, Math.ceil(ms / 86400000));
}

function trialAllowsAccess(status: string | null | undefined, end: string | null | undefined) {
  if (status === "active") return !end || Date.parse(end) > Date.now();
  if (status === "trialing") return Boolean(end && Date.parse(end) > Date.now());
  if (status === "cancelled") return Boolean(end && Date.parse(end) > Date.now());
  return false;
}

function normalizeTrialStatus(value: string | null | undefined): ProTrialStatus | "not_claimed" {
  if (value === "trial_pending_authorization" || value === "trialing" || value === "active" || value === "cancelled" || value === "expired" || value === "payment_failed") return value;
  return "not_claimed";
}

function mapStatus(row: TrialAllocationRow | SubscriptionTrialRow | undefined): ProTrialStatusView {
  if (!row) {
    return {
      configured: isSupabaseAdminConfigured(),
      hasAllocation: false,
      allocationId: null,
      companyName: null,
      plan: "pro",
      status: isSupabaseAdminConfigured() ? "not_claimed" : "unavailable",
      trialStartedAt: null,
      trialEndsAt: null,
      remainingDays: null,
      renewalDate: null,
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      razorpaySubscriptionId: null,
      proAccessAllowed: false,
      slotsLimit: FIRST_20_PRO_TRIAL_LIMIT,
    };
  }

  const trialEndsAt = row.trial_ends_at ?? row.access_ends_at ?? row.current_period_end ?? null;
  const status = normalizeTrialStatus(row.status);

  return {
    configured: true,
    hasAllocation: true,
    allocationId: row.id ?? null,
    companyName: row.company_name ?? null,
    plan: "pro",
    status,
    trialStartedAt: row.trial_started_at ?? row.access_starts_at ?? row.current_period_start ?? null,
    trialEndsAt,
    remainingDays: remainingDays(trialEndsAt),
    renewalDate: row.renewal_date ?? row.next_billing_date ?? trialEndsAt,
    cancelAtPeriodEnd: row.cancel_at_period_end === true,
    cancelledAt: row.cancelled_at ?? null,
    razorpaySubscriptionId: row.razorpay_subscription_id ?? null,
    proAccessAllowed: trialAllowsAccess(status, trialEndsAt),
    slotsLimit: FIRST_20_PRO_TRIAL_LIMIT,
  };
}

export async function getProTrialStatusForUser(user: QueryCiteUser): Promise<ProTrialStatusView> {
  if (!isSupabaseAdminConfigured()) return mapStatus(undefined);

  const subscriptionRows = await selectSupabaseRows<SubscriptionTrialRow>("subscriptions", {
    select: "id,user_id,email,plan_name,status,payment_type,paid_access,trial_started_at,trial_ends_at,access_starts_at,access_ends_at,current_period_start,current_period_end,renewal_date,next_billing_date,razorpay_customer_id,razorpay_subscription_id,cancel_at_period_end,cancelled_at,metadata",
    or: `(user_id.eq.${user.id},email.eq.${user.email})`,
    payment_type: `eq.${FIRST_20_PRO_TRIAL_PAYMENT_TYPE}`,
    order: "updated_at.desc",
    limit: "1",
  });
  if (subscriptionRows[0]) return mapStatus(subscriptionRows[0]);

  const allocationRows = await selectSupabaseRows<TrialAllocationRow>("pro_trial_allocations", {
    select: "id,user_id,email,company_name,plan,status,trial_started_at,trial_ends_at,razorpay_customer_id,razorpay_subscription_id,cancel_at_period_end,cancelled_at,created_at,updated_at",
    user_id: `eq.${user.id}`,
    order: "updated_at.desc",
    limit: "1",
  });

  return mapStatus(allocationRows[0]);
}

export async function claimFirst20ProTrialSlot(user: QueryCiteUser, companyName: string) {
  const rows = await callSupabaseRpc<ClaimTrialRpcRow[]>("claim_first_20_pro_trial", {
    p_user_id: user.id,
    p_email: user.email,
    p_company_name: companyName,
  });
  const result = rows[0];
  if (!result?.allocated || !result.allocation_id) {
    throw new Error(result?.reason === "offer_full" ? "The first 20 company trial allocation is full." : "This account has already claimed the trial offer.");
  }
  return result.allocation_id;
}

export async function savePendingProTrialSubscription(input: {
  allocationId: string;
  user: QueryCiteUser;
  companyName: string;
  razorpayCustomerId: string | null;
  razorpaySubscriptionId: string;
  trialStartedAt: string;
  trialEndsAt: string;
}) {
  const now = nowIso();
  await updateSupabaseRows("pro_trial_allocations", { id: `eq.${input.allocationId}` }, {
    company_name: input.companyName,
    status: "trial_pending_authorization",
    trial_started_at: input.trialStartedAt,
    trial_ends_at: input.trialEndsAt,
    razorpay_customer_id: input.razorpayCustomerId,
    razorpay_subscription_id: input.razorpaySubscriptionId,
    updated_at: now,
  });

  const existing = await selectSupabaseRows<SubscriptionTrialRow>("subscriptions", {
    select: "id",
    razorpay_subscription_id: `eq.${input.razorpaySubscriptionId}`,
    limit: "1",
  });

  const row = {
    user_id: input.user.id,
    email: input.user.email,
    company_name: input.companyName,
    plan_name: "pro",
    plan: "pro",
    status: "trial_pending_authorization",
    provider: "razorpay",
    product: "querycite",
    provider_customer_id: input.razorpayCustomerId,
    provider_subscription_id: input.razorpaySubscriptionId,
    razorpay_customer_id: input.razorpayCustomerId,
    razorpay_subscription_id: input.razorpaySubscriptionId,
    payment_type: FIRST_20_PRO_TRIAL_PAYMENT_TYPE,
    paid_access: false,
    trial_started_at: input.trialStartedAt,
    trial_ends_at: input.trialEndsAt,
    current_period_start: input.trialStartedAt,
    current_period_end: input.trialEndsAt,
    access_starts_at: input.trialStartedAt,
    access_ends_at: input.trialEndsAt,
    renewal_date: input.trialEndsAt,
    next_billing_date: input.trialEndsAt,
    cancel_at_period_end: false,
    metadata: { access_type: FIRST_20_PRO_TRIAL_PAYMENT_TYPE, allocation_id: input.allocationId, trial_days: FIRST_20_PRO_TRIAL_DAYS },
    updated_at: now,
  };

  if (existing[0]?.id) {
    await updateSupabaseRows("subscriptions", { id: `eq.${existing[0].id}` }, row);
    return existing[0].id;
  }

  const inserted = await insertSupabaseRow("subscriptions", { ...row, created_at: now });
  return inserted[0]?.id ?? null;
}

export async function markProTrialCancellation(user: QueryCiteUser, razorpaySubscriptionId: string) {
  const now = nowIso();
  await updateSupabaseRows("pro_trial_allocations", { user_id: `eq.${user.id}`, razorpay_subscription_id: `eq.${razorpaySubscriptionId}` }, {
    status: "cancelled",
    cancel_at_period_end: true,
    cancelled_at: now,
    updated_at: now,
  });
  await updateSupabaseRows("subscriptions", { user_id: `eq.${user.id}`, razorpay_subscription_id: `eq.${razorpaySubscriptionId}` }, {
    status: "cancelled",
    cancel_at_period_end: true,
    cancelled_at: now,
    updated_at: now,
  });
}



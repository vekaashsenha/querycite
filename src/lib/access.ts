import { isSupabaseAdminConfigured, selectSupabaseRows } from "@/lib/supabase/admin";

type AccessLookup = {
  email?: string | null;
  subscriptionId?: string | null;
};

type SubscriptionAccessRow = {
  paid_access?: boolean | null;
  status?: string | null;
  current_period_end?: string | null;
  next_billing_date?: string | null;
  renewal_date?: string | null;
  plan_name?: string | null;
};

export type PaidAccessStatus = {
  verifiedPaidAccess: boolean;
  status: "unpaid" | "active" | "pending" | "cancelled" | "expired" | "unavailable";
  planName: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
};

function isAccessStillAllowed(row: SubscriptionAccessRow) {
  if (row.paid_access === true) return true;
  if (row.status === "cancelled" && row.current_period_end && Date.parse(row.current_period_end) > Date.now()) return true;
  return false;
}

export async function getPaidAccessStatus(lookup: AccessLookup = {}): Promise<PaidAccessStatus> {
  if (!lookup.email && !lookup.subscriptionId) {
    return { verifiedPaidAccess: false, status: "unpaid", planName: null, currentPeriodEnd: null, nextBillingDate: null };
  }

  if (!isSupabaseAdminConfigured()) {
    return { verifiedPaidAccess: false, status: "unavailable", planName: null, currentPeriodEnd: null, nextBillingDate: null };
  }

  const params = lookup.subscriptionId
    ? { select: "paid_access,status,current_period_end,next_billing_date,renewal_date,plan_name", razorpay_subscription_id: `eq.${lookup.subscriptionId}`, order: "updated_at.desc", limit: "1" }
    : { select: "paid_access,status,current_period_end,next_billing_date,renewal_date,plan_name", email: `eq.${lookup.email}`, order: "updated_at.desc", limit: "1" };

  const rows = await selectSupabaseRows<SubscriptionAccessRow>("subscriptions", params);
  const row = rows[0];
  if (!row) {
    return { verifiedPaidAccess: false, status: "unpaid", planName: null, currentPeriodEnd: null, nextBillingDate: null };
  }

  const verifiedPaidAccess = isAccessStillAllowed(row);
  return {
    verifiedPaidAccess,
    status: verifiedPaidAccess ? "active" : row.status === "pending" ? "pending" : row.status === "cancelled" ? "cancelled" : "expired",
    planName: row.plan_name ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    nextBillingDate: row.next_billing_date ?? row.renewal_date ?? null,
  };
}
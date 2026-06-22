import { normalizeWebsiteUrl } from "@/lib/url";
import { normalizePaidPlanName, planLimits, type PaidPlanName, type PlanLimits } from "@/lib/plans";
import { isSupabaseAdminConfigured, selectSupabaseRows } from "@/lib/supabase/admin";
import type { AuditFinding, WebsiteAuditReport } from "@/lib/audit-report";
import { isAdminUser, type QueryCiteUser } from "@/lib/auth/server";

type SubscriptionRow = {
  id?: string | null;
  user_id?: string | null;
  email?: string | null;
  plan_name?: string | null;
  status?: string | null;
  paid_access?: boolean | null;
  website_url?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  next_billing_date?: string | null;
  renewal_date?: string | null;
  razorpay_subscription_id?: string | null;
  provider_customer_id?: string | null;
  provider_subscription_id?: string | null;
};

export type DashboardReport = {
  id: string;
  websiteUrl: string;
  finalUrl: string | null;
  createdAt: string;
  reportType: string;
  aiVisibilityScore: number;
  aeoScore: number;
  geoScore: number;
  aiCrawlerReadinessScore: number;
  findings: AuditFinding[];
  fullReportData: WebsiteAuditReport | null;
};

export type PaymentHistoryItem = {
  id: string;
  amount: number | null;
  currency: string;
  status: string;
  paymentType: string | null;
  planName: string | null;
  razorpayPaymentId: string | null;
  razorpayOrderId: string | null;
  providerInvoiceId: string | null;
  createdAt: string;
};

export type PaidAccessContext = {
  isConfigured: boolean;
  verifiedPaidAccess: boolean;
  isAdmin: boolean;
  qaAccess: boolean;
  subscriptionId: string | null;
  subscriptionRowId: string | null;
  userId: string | null;
  email: string | null;
  planName: PaidPlanName;
  rawPlanName: string | null;
  status: string;
  websiteUrl: string | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  renewalDate: string | null;
  limits: PlanLimits;
};

function isCurrentPeriodActive(end: string | null | undefined) {
  return Boolean(end && Date.parse(end) > Date.now());
}

function rowAllowsPaidAccess(row: SubscriptionRow | undefined) {
  if (!row) return false;
  if (row.paid_access === true) return true;
  if (row.status === "cancelled" && isCurrentPeriodActive(row.current_period_end)) return true;
  return false;
}

function emptyContext(subscriptionId?: string | null, user?: QueryCiteUser | null): PaidAccessContext {
  return {
    isConfigured: isSupabaseAdminConfigured(),
    verifiedPaidAccess: false,
    isAdmin: false,
    qaAccess: false,
    subscriptionId: subscriptionId ?? null,
    subscriptionRowId: null,
    userId: user?.id ?? null,
    email: user?.email ?? null,
    planName: "free",
    rawPlanName: null,
    status: isSupabaseAdminConfigured() ? "unpaid" : "unavailable",
    websiteUrl: null,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    renewalDate: null,
    limits: planLimits.free,
  };
}

function contextFromRow(row: SubscriptionRow | undefined, fallbackSubscriptionId?: string | null, user?: QueryCiteUser | null): PaidAccessContext {
  if (!row) return emptyContext(fallbackSubscriptionId, user);

  const planName = normalizePaidPlanName(row.plan_name);
  const verifiedPaidAccess = rowAllowsPaidAccess(row);
  const subscriptionId = row.razorpay_subscription_id || row.provider_subscription_id || fallbackSubscriptionId || null;

  return {
    isConfigured: true,
    verifiedPaidAccess,
    isAdmin: false,
    qaAccess: false,
    subscriptionId,
    subscriptionRowId: row.id ?? null,
    userId: row.user_id ?? user?.id ?? null,
    email: row.email ?? user?.email ?? null,
    planName: verifiedPaidAccess ? planName : "free",
    rawPlanName: row.plan_name ?? null,
    status: verifiedPaidAccess ? "active" : row.status || "unpaid",
    websiteUrl: row.website_url ?? null,
    currentPeriodStart: row.current_period_start ?? null,
    currentPeriodEnd: row.current_period_end ?? null,
    renewalDate: row.next_billing_date ?? row.renewal_date ?? row.current_period_end ?? null,
    limits: verifiedPaidAccess ? planLimits[planName] : planLimits.free,
  };
}

const subscriptionSelect = "id,user_id,email,plan_name,status,paid_access,website_url,current_period_start,current_period_end,next_billing_date,renewal_date,razorpay_subscription_id,provider_subscription_id,provider_customer_id";

export async function getPaidAccessContext(subscriptionId?: string | null): Promise<PaidAccessContext> {
  if (!subscriptionId || !isSupabaseAdminConfigured()) return emptyContext(subscriptionId);

  const rows = await selectSupabaseRows<SubscriptionRow>("subscriptions", {
    select: subscriptionSelect,
    razorpay_subscription_id: `eq.${subscriptionId}`,
    order: "updated_at.desc",
    limit: "1",
  });

  return contextFromRow(rows[0], subscriptionId);
}

export async function getPaidAccessContextForUser(user: QueryCiteUser | null): Promise<PaidAccessContext> {
  if (!user) return emptyContext(null, user);

  const admin = await isAdminUser(user);
  if (!isSupabaseAdminConfigured()) {
    const empty = emptyContext(null, user);
    return admin ? { ...empty, isAdmin: true, qaAccess: true, planName: "adminQa", rawPlanName: "Admin QA access", status: "admin_qa", limits: planLimits.adminQa } : empty;
  }

  const rows = await selectSupabaseRows<SubscriptionRow>("subscriptions", {
    select: subscriptionSelect,
    or: `(user_id.eq.${user.id},email.eq.${user.email})`,
    order: "updated_at.desc",
    limit: "1",
  });

  const context = contextFromRow(rows[0], rows[0]?.razorpay_subscription_id || rows[0]?.provider_subscription_id || null, user);
  if (!admin) return context;

  return {
    ...context,
    isAdmin: true,
    qaAccess: true,
    planName: context.verifiedPaidAccess ? context.planName : "adminQa",
    rawPlanName: context.verifiedPaidAccess ? context.rawPlanName : "Admin QA access",
    status: context.verifiedPaidAccess ? context.status : "admin_qa",
    limits: context.verifiedPaidAccess ? context.limits : planLimits.adminQa,
  };
}

function numberOrZero(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toFindings(value: unknown): AuditFinding[] {
  return Array.isArray(value) ? value.filter((item): item is AuditFinding => Boolean(item && typeof item === "object" && "issue" in item)) : [];
}

function toWebsiteAuditReport(value: unknown): WebsiteAuditReport | null {
  if (!value || typeof value !== "object") return null;
  const report = value as Partial<WebsiteAuditReport>;
  return report.reportVersion === "website-readiness-v1" && Boolean(report.finalUrl && report.scores) ? value as WebsiteAuditReport : null;
}

type ReportRow = {
  id?: string | null;
  website_url?: string | null;
  final_url?: string | null;
  report_type?: string | null;
  ai_visibility_score?: number | null;
  aeo_score?: number | null;
  geo_score?: number | null;
  ai_crawler_readiness_score?: number | null;
  findings?: unknown;
  full_report_data?: unknown;
  created_at?: string | null;
};

function mapReport(row: ReportRow): DashboardReport | null {
  if (!row.id || !row.website_url) return null;
  return {
    id: row.id,
    websiteUrl: row.website_url,
    finalUrl: row.final_url ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
    reportType: row.report_type ?? "free",
    aiVisibilityScore: numberOrZero(row.ai_visibility_score),
    aeoScore: numberOrZero(row.aeo_score),
    geoScore: numberOrZero(row.geo_score),
    aiCrawlerReadinessScore: numberOrZero(row.ai_crawler_readiness_score),
    findings: toFindings(row.findings).slice(0, 3),
    fullReportData: toWebsiteAuditReport(row.full_report_data),
  };
}

export async function getReportsForAuthenticatedUser(user: QueryCiteUser): Promise<DashboardReport[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const rows = await selectSupabaseRows<ReportRow>("reports", {
    select: "id,website_url,final_url,report_type,ai_visibility_score,aeo_score,geo_score,ai_crawler_readiness_score,findings,full_report_data,created_at",
    user_id: `eq.${user.id}`,
    order: "created_at.desc",
    limit: "50",
  });

  return rows.map(mapReport).filter((report): report is DashboardReport => Boolean(report));
}

export async function getReportsForPaidContext(context: PaidAccessContext): Promise<DashboardReport[]> {
  if (!context.verifiedPaidAccess || !context.websiteUrl || !isSupabaseAdminConfigured()) return [];
  const normalizedWebsite = normalizeWebsiteUrl(context.websiteUrl);
  if (!normalizedWebsite) return [];

  const rows = await selectSupabaseRows<ReportRow>("reports", {
    select: "id,website_url,final_url,report_type,ai_visibility_score,aeo_score,geo_score,ai_crawler_readiness_score,findings,full_report_data,created_at",
    website_url: `eq.${normalizedWebsite}`,
    order: "created_at.desc",
    limit: "25",
  });

  return rows.map(mapReport).filter((report): report is DashboardReport => Boolean(report));
}

type PaymentRow = {
  id?: string | null;
  amount?: number | null;
  amount_cents?: number | null;
  currency?: string | null;
  status?: string | null;
  payment_type?: string | null;
  plan_name?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  provider_invoice_id?: string | null;
  created_at?: string | null;
};

function mapPayment(row: PaymentRow): PaymentHistoryItem {
  return {
    id: row.id ?? `${row.razorpay_payment_id ?? "payment"}-${row.created_at ?? ""}`,
    amount: row.amount ?? row.amount_cents ?? null,
    currency: row.currency ?? "INR",
    status: row.status ?? "unknown",
    paymentType: row.payment_type ?? null,
    planName: row.plan_name ?? null,
    razorpayPaymentId: row.razorpay_payment_id ?? null,
    razorpayOrderId: row.razorpay_order_id ?? null,
    providerInvoiceId: row.provider_invoice_id ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export async function getPaymentHistoryForPaidContext(context: PaidAccessContext): Promise<PaymentHistoryItem[]> {
  if (!context.subscriptionId || !isSupabaseAdminConfigured()) return [];

  const rows = await selectSupabaseRows<PaymentRow>("payments", {
    select: "id,amount,amount_cents,currency,status,payment_type,plan_name,razorpay_payment_id,razorpay_order_id,provider_invoice_id,created_at",
    razorpay_subscription_id: `eq.${context.subscriptionId}`,
    order: "created_at.desc",
    limit: "20",
  });

  return rows.map(mapPayment);
}

export async function getPaymentHistoryForUser(user: QueryCiteUser): Promise<PaymentHistoryItem[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const rows = await selectSupabaseRows<PaymentRow>("payments", {
    select: "id,amount,amount_cents,currency,status,payment_type,plan_name,razorpay_payment_id,razorpay_order_id,provider_invoice_id,created_at",
    or: `(user_id.eq.${user.id},email.eq.${user.email})`,
    order: "created_at.desc",
    limit: "20",
  });

  return rows.map(mapPayment);
}

export function formatPaise(amount: number | null, currency = "INR") {
  if (amount === null) return "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount / 100);
}

export function getAdvisorResetDate(context: PaidAccessContext) {
  return context.currentPeriodEnd ?? context.renewalDate ?? new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString();
}

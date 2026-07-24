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
  razorpay_order_id?: string | null;
  payment_type?: string | null;
  coupon_code?: string | null;
  amount_paise?: number | null;
  currency?: string | null;
  company_name?: string | null;
  plan?: string | null;
  trial_started_at?: string | null;
  trial_ends_at?: string | null;
  access_starts_at?: string | null;
  access_ends_at?: string | null;
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
  couponCode: string | null;
  accessStartsAt: string | null;
  accessEndsAt: string | null;
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
  paymentType: string | null;
  couponCode: string | null;
  amountPaise: number | null;
  currency: string;
  accessStartsAt: string | null;
  accessEndsAt: string | null;
  isPaidBetaAccess: boolean;
  isExpiredBetaAccess: boolean;
  limits: PlanLimits;
};

function isCurrentPeriodActive(end: string | null | undefined) {
  return Boolean(end && Date.parse(end) > Date.now());
}

function hasAccessStarted(start: string | null | undefined) {
  return !start || Date.parse(start) <= Date.now();
}

function isOneTimeBetaRow(row: SubscriptionRow | undefined) {
  return row?.payment_type === "one_time_beta";
}

function betaAccessEnd(row: SubscriptionRow | undefined) {
  return row?.access_ends_at ?? row?.trial_ends_at ?? row?.current_period_end ?? null;
}

function isFirst20ProTrialRow(row: SubscriptionRow | undefined) {
  return row?.payment_type === "first_20_pro_trial";
}

function rowAllowsPaidAccess(row: SubscriptionRow | undefined) {
  if (!row) return false;
  const end = betaAccessEnd(row);

  if (isOneTimeBetaRow(row) || row.coupon_code) {
    return row.paid_access === true && row.status === "active" && hasAccessStarted(row.access_starts_at ?? row.current_period_start) && isCurrentPeriodActive(end);
  }

  if (isFirst20ProTrialRow(row)) {
    const trialStatusAllowsAccess = row.status === "trialing" || row.status === "active" || row.status === "cancelled";
    return row.paid_access === true && trialStatusAllowsAccess && hasAccessStarted(row.access_starts_at ?? row.trial_started_at ?? row.current_period_start) && isCurrentPeriodActive(end);
  }

  if (row.paid_access === true && end) return isCurrentPeriodActive(end);
  if (row.paid_access === true) return true;
  if (row.status === "cancelled" && isCurrentPeriodActive(row.current_period_end)) return true;
  return false;
}

function statusFromRow(row: SubscriptionRow, verifiedPaidAccess: boolean) {
  if (verifiedPaidAccess && isFirst20ProTrialRow(row) && row.status) return row.status;
  if (verifiedPaidAccess) return "active";
  if ((isOneTimeBetaRow(row) || row.coupon_code) && row.status === "active" && !isCurrentPeriodActive(betaAccessEnd(row))) return "expired";
  return row.status || "unpaid";
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
    paymentType: null,
    couponCode: null,
    amountPaise: null,
    currency: "INR",
    accessStartsAt: null,
    accessEndsAt: null,
    isPaidBetaAccess: false,
    isExpiredBetaAccess: false,
    limits: planLimits.free,
  };
}

function contextFromRow(row: SubscriptionRow | undefined, fallbackSubscriptionId?: string | null, user?: QueryCiteUser | null): PaidAccessContext {
  if (!row) return emptyContext(fallbackSubscriptionId, user);

  const planName = normalizePaidPlanName(row.plan_name);
  const verifiedPaidAccess = rowAllowsPaidAccess(row);
  const subscriptionId = row.razorpay_subscription_id || row.provider_subscription_id || row.razorpay_order_id || fallbackSubscriptionId || row.id || null;
  const accessEnd = betaAccessEnd(row);
  const oneTimeBeta = isOneTimeBetaRow(row);

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
    status: statusFromRow(row, verifiedPaidAccess),
    websiteUrl: row.website_url ?? null,
    currentPeriodStart: row.access_starts_at ?? row.current_period_start ?? null,
    currentPeriodEnd: accessEnd,
    renewalDate: row.next_billing_date ?? row.renewal_date ?? accessEnd,
    paymentType: row.payment_type ?? null,
    couponCode: row.coupon_code ?? null,
    amountPaise: row.amount_paise ?? null,
    currency: row.currency ?? "INR",
    accessStartsAt: row.access_starts_at ?? row.current_period_start ?? null,
    accessEndsAt: accessEnd,
    isPaidBetaAccess: oneTimeBeta && verifiedPaidAccess,
    isExpiredBetaAccess: oneTimeBeta && !verifiedPaidAccess && Boolean(accessEnd && Date.parse(accessEnd) <= Date.now()),
    limits: verifiedPaidAccess ? planLimits[planName] : planLimits.free,
  };
}

const subscriptionSelect = "id,user_id,email,plan_name,status,paid_access,website_url,current_period_start,current_period_end,next_billing_date,renewal_date,razorpay_subscription_id,provider_subscription_id,provider_customer_id,razorpay_order_id,payment_type,coupon_code,amount_paise,currency,company_name,plan,trial_started_at,trial_ends_at,access_starts_at,access_ends_at";

export async function getPaidAccessContext(subscriptionId?: string | null): Promise<PaidAccessContext> {
  if (!subscriptionId || !isSupabaseAdminConfigured()) return emptyContext(subscriptionId);

  const params = subscriptionId.startsWith("order_")
    ? { select: subscriptionSelect, razorpay_order_id: `eq.${subscriptionId}`, order: "updated_at.desc", limit: "1" }
    : { select: subscriptionSelect, razorpay_subscription_id: `eq.${subscriptionId}`, order: "updated_at.desc", limit: "1" };

  const rows = await selectSupabaseRows<SubscriptionRow>("subscriptions", params);

  return contextFromRow(rows[0], subscriptionId);
}

export async function getPaidAccessContextForUser(user: QueryCiteUser | null): Promise<PaidAccessContext> {
  if (!user) return emptyContext(null, user);

  const admin = await isAdminUser(user);
  if (!isSupabaseAdminConfigured()) {
    const empty = emptyContext(null, user);
    return admin ? { ...empty, isAdmin: true, qaAccess: true, planName: "adminQa", rawPlanName: "Admin", status: "admin", limits: planLimits.adminQa } : empty;
  }

  const rows = await selectSupabaseRows<SubscriptionRow>("subscriptions", {
    select: subscriptionSelect,
    or: `(user_id.eq.${user.id},email.eq.${user.email})`,
    order: "updated_at.desc",
    limit: "20",
  });

  const selectedRow = rows.find(rowAllowsPaidAccess) ?? rows[0];
  const context = contextFromRow(selectedRow, selectedRow?.razorpay_subscription_id || selectedRow?.provider_subscription_id || selectedRow?.razorpay_order_id || null, user);
  if (!admin) return context;

  return {
    ...context,
    isAdmin: true,
    qaAccess: true,
    planName: context.verifiedPaidAccess ? context.planName : "adminQa",
    rawPlanName: context.verifiedPaidAccess ? context.rawPlanName : "Admin",
    status: context.verifiedPaidAccess ? context.status : "admin",
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
  amount_paise?: number | null;
  amount_cents?: number | null;
  currency?: string | null;
  status?: string | null;
  payment_type?: string | null;
  plan_name?: string | null;
  coupon_code?: string | null;
  access_starts_at?: string | null;
  access_ends_at?: string | null;
  razorpay_payment_id?: string | null;
  razorpay_order_id?: string | null;
  provider_invoice_id?: string | null;
  created_at?: string | null;
};

function mapPayment(row: PaymentRow): PaymentHistoryItem {
  return {
    id: row.id ?? `${row.razorpay_payment_id ?? "payment"}-${row.created_at ?? ""}`,
    amount: row.amount_paise ?? row.amount ?? row.amount_cents ?? null,
    currency: row.currency ?? "INR",
    status: row.status ?? "unknown",
    paymentType: row.payment_type ?? null,
    planName: row.plan_name ?? null,
    couponCode: row.coupon_code ?? null,
    accessStartsAt: row.access_starts_at ?? null,
    accessEndsAt: row.access_ends_at ?? null,
    razorpayPaymentId: row.razorpay_payment_id ?? null,
    razorpayOrderId: row.razorpay_order_id ?? null,
    providerInvoiceId: row.provider_invoice_id ?? null,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

const paymentSelect = "id,amount,amount_paise,amount_cents,currency,status,payment_type,plan_name,coupon_code,access_starts_at,access_ends_at,razorpay_payment_id,razorpay_order_id,provider_invoice_id,created_at";

export async function getPaymentHistoryForPaidContext(context: PaidAccessContext): Promise<PaymentHistoryItem[]> {
  if (!context.subscriptionId || !isSupabaseAdminConfigured()) return [];

  const params = context.paymentType === "one_time_beta"
    ? { select: paymentSelect, razorpay_order_id: `eq.${context.subscriptionId}`, order: "created_at.desc", limit: "20" }
    : { select: paymentSelect, razorpay_subscription_id: `eq.${context.subscriptionId}`, order: "created_at.desc", limit: "20" };

  const rows = await selectSupabaseRows<PaymentRow>("payments", params);
  return rows.map(mapPayment);
}

export async function getPaymentHistoryForUser(user: QueryCiteUser): Promise<PaymentHistoryItem[]> {
  if (!isSupabaseAdminConfigured()) return [];

  const rows = await selectSupabaseRows<PaymentRow>("payments", {
    select: paymentSelect,
    or: `(user_id.eq.${user.id},email.eq.${user.email})`,
    order: "created_at.desc",
    limit: "20",
  });

  return rows.map(mapPayment);
}

export async function getPaymentForUserById(user: QueryCiteUser, paymentId: string): Promise<PaymentHistoryItem | null> {
  if (!paymentId || !isSupabaseAdminConfigured()) return null;

  const rows = await selectSupabaseRows<PaymentRow>("payments", {
    select: paymentSelect,
    id: `eq.${paymentId}`,
    or: `(user_id.eq.${user.id},email.eq.${user.email})`,
    limit: "1",
  });

  return rows[0] ? mapPayment(rows[0]) : null;
}

export function isPaidPaymentRecord(payment: PaymentHistoryItem) {
  return ["captured", "paid", "active", "paid_beta_active"].includes(payment.status.toLowerCase());
}

export function receiptNumberForPayment(payment: PaymentHistoryItem) {
  const date = new Date(payment.createdAt);
  const datePart = Number.isNaN(date.getTime())
    ? "00000000"
    : `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}${String(date.getUTCDate()).padStart(2, "0")}`;
  const source = payment.razorpayPaymentId || payment.razorpayOrderId || payment.id;
  const suffix = source.replace(/[^a-zA-Z0-9]/g, "").slice(-6).toUpperCase().padStart(6, "0");
  return `QC-${datePart}-${suffix}`;
}

export function formatPaise(amount: number | null, currency = "INR") {
  if (amount === null) return "-";
  return new Intl.NumberFormat("en-IN", { style: "currency", currency }).format(amount / 100);
}

export function getAdvisorResetDate(context: PaidAccessContext) {
  return context.currentPeriodEnd ?? context.renewalDate ?? new Date(new Date().setMonth(new Date().getMonth() + 1)).toISOString();
}


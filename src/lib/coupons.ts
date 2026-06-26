import { isSupabaseAdminConfigured, selectSupabaseRows } from "@/lib/supabase/admin";
import { isRazorpayPlanName, type RazorpayPlanName } from "@/lib/razorpay";

export const IIMA_BETA_AMOUNT_PAISE = 19900;
export const IIMA_BETA_CURRENCY = "INR" as const;
export const IIMA_BETA_ACCESS_DAYS = 30;
export const IIMA_BETA_CAMPAIGN_CAPACITY = 100;
export const IIMA_BETA_COUPON_ERROR = "This coupon is invalid, expired, already used, or fully redeemed.";
export const IIMA_BETA_ALREADY_USED_ERROR = "This beta offer has already been used for this account.";
export const IIMA_BETA_SEATS_CLAIMED_ERROR = "The first 100 beta seats are already claimed.";
export const IIMA_BETA_SUCCESS_MESSAGE = "IIMA beta offer applied. Final amount: \u20B9199. Access valid for 1 month.";

export const IIMA_BETA_COUPON_CODES = ["IIMA-AGMP18", "IIMA-DMBPT02"] as const;

type CouponCodeRow = {
  id?: string | null;
  code?: string | null;
  final_amount_paise?: number | null;
  currency?: string | null;
  max_redemptions?: number | null;
  redeemed_count?: number | null;
  is_active?: boolean | null;
  expires_at?: string | null;
  description?: string | null;
};

export type CouponRedemptionRow = {
  id?: string | null;
  coupon_id?: string | null;
  code?: string | null;
  user_id?: string | null;
  email?: string | null;
  razorpay_payment_id?: string | null;
  status?: string | null;
};

export type CouponValidationResult =
  | {
      valid: true;
      couponId: string;
      code: string;
      finalAmountPaise: number;
      currency: "INR";
      description: string | null;
    }
  | { valid: false; error: string; reason: string };

function cleanEmail(value: string | null | undefined) {
  return value ? value.trim().toLowerCase() : "";
}

export function normalizeCouponCode(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, "").trim().toUpperCase() : "";
}

export function isIimaBetaCouponCode(value: unknown): value is typeof IIMA_BETA_COUPON_CODES[number] {
  const code = normalizeCouponCode(value);
  return IIMA_BETA_COUPON_CODES.includes(code as typeof IIMA_BETA_COUPON_CODES[number]);
}

export function isSuccessfulCouponRedemptionStatus(status: string | null | undefined) {
  return status === "captured" || status === "completed" || status === "active" || status === "paid_beta_active";
}

function couponExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.now());
}

function amountPaiseFromCoupon(row: CouponCodeRow | null | undefined) {
  return typeof row?.final_amount_paise === "number" && row.final_amount_paise > 0
    ? row.final_amount_paise
    : IIMA_BETA_AMOUNT_PAISE;
}

function formatPaiseForLog(amountPaise: number) {
  return (amountPaise / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amountPaise % 100 === 0 ? 0 : 2,
  });
}

async function getCoupon(code: string) {
  const rows = await selectSupabaseRows<CouponCodeRow>("coupon_codes", {
    select: "id,code,description,final_amount_paise,currency,max_redemptions,redeemed_count,is_active,expires_at",
    code: `eq.${code}`,
    limit: "1",
  });
  return rows[0] ?? null;
}

async function getCouponRedemptionsByCode(code: string) {
  return await selectSupabaseRows<CouponRedemptionRow>("coupon_redemptions", {
    select: "id,coupon_id,code,user_id,email,razorpay_payment_id,status",
    code: `eq.${code}`,
    limit: "500",
  });
}

export async function getIimaCouponRedemptions() {
  const results = await Promise.all(IIMA_BETA_COUPON_CODES.map((code) => getCouponRedemptionsByCode(code)));
  return results.flat();
}

function successfulIimaRedemptions(rows: CouponRedemptionRow[]) {
  return rows.filter((row) => isIimaBetaCouponCode(row.code) && isSuccessfulCouponRedemptionStatus(row.status));
}

export function countSuccessfulIimaRedemptions(rows: CouponRedemptionRow[]) {
  const uniqueUsers = new Set<string>();

  successfulIimaRedemptions(rows).forEach((row) => {
    const userKey = row.user_id ? `user:${row.user_id}` : "";
    const emailKey = cleanEmail(row.email) ? `email:${cleanEmail(row.email)}` : "";
    const paymentKey = row.razorpay_payment_id ? `payment:${row.razorpay_payment_id}` : "";
    const fallbackKey = row.id ? `row:${row.id}` : "unknown";
    uniqueUsers.add(userKey || emailKey || paymentKey || fallbackKey);
  });

  return uniqueUsers.size;
}

export function userAlreadyRedeemedIimaCoupon(rows: CouponRedemptionRow[], userId: string | null | undefined, email: string | null | undefined) {
  const normalizedEmail = cleanEmail(email);
  return successfulIimaRedemptions(rows).some((row) => {
    if (userId && row.user_id === userId) return true;
    if (normalizedEmail && cleanEmail(row.email) === normalizedEmail) return true;
    return false;
  });
}

function logCouponValidation(input: {
  receivedCode: string;
  normalizedCode: string;
  coupon: CouponCodeRow | null;
  totalSuccessfulIimaRedemptions: number;
  userOrEmailPresent: boolean;
  alreadyRedeemed: boolean;
  valid: boolean;
  reason: string;
}) {
  const rawAmountPaise = amountPaiseFromCoupon(input.coupon);
  console.info("IIMA coupon validation", {
    receivedCode: input.receivedCode,
    normalizedCode: input.normalizedCode || null,
    couponFound: Boolean(input.coupon?.id),
    isActive: input.coupon?.is_active ?? null,
    displayedAmount: formatPaiseForLog(rawAmountPaise),
    rawAmountPaise,
    totalSuccessfulIimaRedemptions: input.totalSuccessfulIimaRedemptions,
    campaignCapacity: IIMA_BETA_CAMPAIGN_CAPACITY,
    userOrEmailPresent: input.userOrEmailPresent,
    alreadyRedeemed: input.alreadyRedeemed,
    valid: input.valid,
    reason: input.reason,
  });
}

export async function validateIimaCouponForCheckout(input: { code: unknown; selectedPlan: unknown; userId?: string | null; email?: string | null }): Promise<CouponValidationResult> {
  const receivedCode = typeof input.code === "string" ? input.code.trim() : "";
  const code = normalizeCouponCode(input.code);
  const userOrEmailPresent = Boolean(input.userId || cleanEmail(input.email));
  let coupon: CouponCodeRow | null = null;
  let redemptions: CouponRedemptionRow[] = [];
  let totalSuccessfulIimaRedemptions = 0;
  let alreadyRedeemed = false;

  function finish(result: CouponValidationResult, reason: string) {
    logCouponValidation({
      receivedCode,
      normalizedCode: code,
      coupon,
      totalSuccessfulIimaRedemptions,
      userOrEmailPresent,
      alreadyRedeemed,
      valid: result.valid,
      reason,
    });
    return result;
  }

  if (!isIimaBetaCouponCode(code)) {
    return finish({ valid: false, error: IIMA_BETA_COUPON_ERROR, reason: "code_not_allowed" }, "code_not_allowed");
  }

  if (!isRazorpayPlanName(input.selectedPlan)) {
    return finish({ valid: false, error: IIMA_BETA_COUPON_ERROR, reason: "invalid_plan" }, "invalid_plan");
  }

  if (!isSupabaseAdminConfigured()) {
    return finish({ valid: false, error: IIMA_BETA_COUPON_ERROR, reason: "supabase_not_configured" }, "supabase_not_configured");
  }

  coupon = await getCoupon(code);
  if (!coupon?.id) {
    return finish({ valid: false, error: IIMA_BETA_COUPON_ERROR, reason: "coupon_not_found" }, "coupon_not_found");
  }

  if (coupon.is_active !== true) {
    return finish({ valid: false, error: IIMA_BETA_COUPON_ERROR, reason: "coupon_inactive" }, "coupon_inactive");
  }

  if (couponExpired(coupon.expires_at)) {
    return finish({ valid: false, error: IIMA_BETA_COUPON_ERROR, reason: "coupon_expired" }, "coupon_expired");
  }

  redemptions = await getIimaCouponRedemptions();
  totalSuccessfulIimaRedemptions = countSuccessfulIimaRedemptions(redemptions);
  alreadyRedeemed = userAlreadyRedeemedIimaCoupon(redemptions, input.userId, input.email);

  if (alreadyRedeemed) {
    return finish({ valid: false, error: IIMA_BETA_ALREADY_USED_ERROR, reason: "already_redeemed" }, "already_redeemed");
  }

  if (totalSuccessfulIimaRedemptions >= IIMA_BETA_CAMPAIGN_CAPACITY) {
    return finish({ valid: false, error: IIMA_BETA_SEATS_CLAIMED_ERROR, reason: "campaign_capacity_reached" }, "campaign_capacity_reached");
  }

  return finish({
    valid: true,
    couponId: coupon.id,
    code,
    finalAmountPaise: amountPaiseFromCoupon(coupon),
    currency: coupon.currency === "INR" ? "INR" : IIMA_BETA_CURRENCY,
    description: coupon.description ?? null,
  }, "valid");
}

export function betaAccessWindow(capturedAt = new Date()) {
  const startsAt = capturedAt.toISOString();
  const ends = new Date(capturedAt);
  ends.setDate(ends.getDate() + IIMA_BETA_ACCESS_DAYS);
  return { startsAt, endsAt: ends.toISOString() };
}

export type { RazorpayPlanName };

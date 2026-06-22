import { isSupabaseAdminConfigured, selectSupabaseRows } from "@/lib/supabase/admin";
import { isRazorpayPlanName, type RazorpayPlanName } from "@/lib/razorpay";

export const IIMA_BETA_AMOUNT_PAISE = 19900;
export const IIMA_BETA_CURRENCY = "INR" as const;
export const IIMA_BETA_ACCESS_DAYS = 30;
export const IIMA_BETA_COUPON_ERROR = "This coupon is invalid, expired, already used, or fully redeemed.";

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

type CouponRedemptionRow = {
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
  | { valid: false; error: string };

function cleanEmail(value: string | null | undefined) {
  return value ? value.trim().toLowerCase() : "";
}

export function normalizeCouponCode(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, "").trim().toUpperCase() : "";
}

function isCapturedStatus(status: string | null | undefined) {
  return status === "captured" || status === "active" || status === "paid_beta_active";
}

function couponExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.now());
}

function couponFullyRedeemed(row: CouponCodeRow) {
  const max = row.max_redemptions ?? 50;
  const redeemed = row.redeemed_count ?? 0;
  return redeemed >= max;
}

async function getCoupon(code: string) {
  const rows = await selectSupabaseRows<CouponCodeRow>("coupon_codes", {
    select: "id,code,description,final_amount_paise,currency,max_redemptions,redeemed_count,is_active,expires_at",
    code: `eq.${code}`,
    limit: "1",
  });
  return rows[0] ?? null;
}

async function getCouponRedemptions(code: string) {
  return await selectSupabaseRows<CouponRedemptionRow>("coupon_redemptions", {
    select: "id,coupon_id,code,user_id,email,razorpay_payment_id,status",
    code: `eq.${code}`,
    limit: "200",
  });
}

function userAlreadyRedeemed(rows: CouponRedemptionRow[], userId: string | null | undefined, email: string | null | undefined) {
  const normalizedEmail = cleanEmail(email);
  return rows.some((row) => {
    if (!isCapturedStatus(row.status)) return false;
    if (userId && row.user_id === userId) return true;
    if (normalizedEmail && cleanEmail(row.email) === normalizedEmail) return true;
    return false;
  });
}

export async function validateIimaCouponForCheckout(input: { code: unknown; selectedPlan: unknown; userId?: string | null; email?: string | null }): Promise<CouponValidationResult> {
  const code = normalizeCouponCode(input.code);

  if (!IIMA_BETA_COUPON_CODES.includes(code as typeof IIMA_BETA_COUPON_CODES[number])) {
    return { valid: false, error: IIMA_BETA_COUPON_ERROR };
  }

  if (!isRazorpayPlanName(input.selectedPlan)) {
    return { valid: false, error: IIMA_BETA_COUPON_ERROR };
  }

  if (!isSupabaseAdminConfigured()) {
    return { valid: false, error: IIMA_BETA_COUPON_ERROR };
  }

  const coupon = await getCoupon(code);
  if (!coupon?.id || coupon.is_active === false || couponExpired(coupon.expires_at) || couponFullyRedeemed(coupon)) {
    return { valid: false, error: IIMA_BETA_COUPON_ERROR };
  }

  const redemptions = await getCouponRedemptions(code);
  if (userAlreadyRedeemed(redemptions, input.userId, input.email)) {
    return { valid: false, error: IIMA_BETA_COUPON_ERROR };
  }

  return {
    valid: true,
    couponId: coupon.id,
    code,
    finalAmountPaise: coupon.final_amount_paise ?? IIMA_BETA_AMOUNT_PAISE,
    currency: coupon.currency === "INR" ? "INR" : IIMA_BETA_CURRENCY,
    description: coupon.description ?? null,
  };
}

export function betaAccessWindow(capturedAt = new Date()) {
  const startsAt = capturedAt.toISOString();
  const ends = new Date(capturedAt);
  ends.setDate(ends.getDate() + IIMA_BETA_ACCESS_DAYS);
  return { startsAt, endsAt: ends.toISOString() };
}

export type { RazorpayPlanName };

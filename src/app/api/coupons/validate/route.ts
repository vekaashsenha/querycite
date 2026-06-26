import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/server";
import { IIMA_BETA_COUPON_ERROR, IIMA_BETA_SUCCESS_MESSAGE, validateIimaCouponForCheckout } from "@/lib/coupons";

export const runtime = "nodejs";

type ValidateCouponRequest = {
  code?: unknown;
  selected_plan?: unknown;
  email?: unknown;
};

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ValidateCouponRequest;
    const user = await getCurrentUser();
    const email = user?.email || cleanEmail(body.email) || null;

    const result = await validateIimaCouponForCheckout({
      code: body.code,
      selectedPlan: body.selected_plan,
      userId: user?.id ?? null,
      email,
    });

    if (!result.valid) {
      return NextResponse.json({ error: result.error, reason: result.reason }, { status: 400 });
    }

    return NextResponse.json({
      valid: true,
      code: result.code,
      final_amount_paise: result.finalAmountPaise,
      currency: result.currency,
      message: IIMA_BETA_SUCCESS_MESSAGE,
    });
  } catch (error) {
    console.error("Coupon validation failed", error);
    return NextResponse.json({ error: IIMA_BETA_COUPON_ERROR }, { status: 500 });
  }
}

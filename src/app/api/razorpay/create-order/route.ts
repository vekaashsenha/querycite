import { NextResponse } from "next/server";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { IIMA_BETA_ACCESS_DAYS, validateIimaCouponForCheckout } from "@/lib/coupons";
import { createRazorpayOrder, getOneTimeOrderAmount, isRazorpayPlanName } from "@/lib/razorpay";
import { normalizeWebsiteUrl } from "@/lib/url";

export const runtime = "nodejs";

type CreateOrderRequest = {
  plan?: unknown;
  coupon_code?: unknown;
  name?: string;
  email?: string;
  website_url?: string;
  company_name?: string;
};

const loginRequiredMessage = "Please create an account or log in before payment so we can activate your access.";

function compactText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderRequest;
    const plan = body.plan;

    if (!isRazorpayPlanName(plan)) {
      return NextResponse.json({ error: "Please select a valid QueryCite beta plan." }, { status: 400 });
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: loginRequiredMessage, code: "login_required" }, { status: 401 });
    }
    await syncAuthenticatedUser(user);

    const websiteUrlInput = compactText(body.website_url);
    const websiteUrl = websiteUrlInput ? normalizeWebsiteUrl(websiteUrlInput) : undefined;

    if (websiteUrlInput && !websiteUrl) {
      return NextResponse.json({ error: "Please enter a valid website, for example byldgroup.com" }, { status: 400 });
    }

    const checkoutEmail = user.email;
    const couponCodeInput = compactText(body.coupon_code);
    let amount = getOneTimeOrderAmount(plan);
    let couponCode: string | undefined;

    if (couponCodeInput) {
      const coupon = await validateIimaCouponForCheckout({
        code: couponCodeInput,
        selectedPlan: plan,
        userId: user.id,
        email: checkoutEmail,
      });

      if (!coupon.valid) {
        return NextResponse.json({ error: coupon.error, reason: coupon.reason }, { status: 400 });
      }

      amount = coupon.finalAmountPaise;
      couponCode = coupon.code;
    }

    const checkoutData = await createRazorpayOrder({
      plan,
      amount,
      couponCode,
      couponFinalAmountPaise: couponCode ? amount : undefined,
      couponType: couponCode ? "iima_beta" : undefined,
      paymentType: "one_time_beta",
      accessDurationDays: IIMA_BETA_ACCESS_DAYS,
      userId: user.id,
      name: compactText(body.name) || user.name || undefined,
      email: checkoutEmail,
      websiteUrl: websiteUrl || undefined,
      companyName: compactText(body.company_name) || undefined,
    });

    return NextResponse.json(checkoutData);
  } catch (error) {
    console.error("Razorpay beta order creation failed", error);
    const message = error instanceof Error ? error.message : "Razorpay payment is temporarily unavailable.";
    const safeMessage = /RAZORPAY_|NEXT_PUBLIC_RAZORPAY/.test(message)
      ? "Secure payment is not configured yet."
      : message;

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}

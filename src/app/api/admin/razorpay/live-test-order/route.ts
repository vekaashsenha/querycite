import { NextResponse } from "next/server";
import { getCurrentUser, isAdminUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { createRazorpayOrder } from "@/lib/razorpay";

export const runtime = "nodejs";

const adminLiveTestAmountPaise = 1000;
const adminLiveTestValidityDays = 30;

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Login is required for this admin test." }, { status: 401 });
    }

    const isAdmin = await isAdminUser(user);
    if (!isAdmin) {
      return NextResponse.json({ error: "Admin access is required for this payment test." }, { status: 403 });
    }

    await syncAuthenticatedUser(user);

    const checkoutData = await createRazorpayOrder({
      plan: "starter",
      amount: adminLiveTestAmountPaise,
      paymentType: "admin_live_test",
      accessDurationDays: adminLiveTestValidityDays,
      userId: user.id,
      name: user.name || undefined,
      email: user.email,
      extraNotes: {
        product: "querycite",
        plan: "starter",
        plan_name: "starter",
        selected_plan: "starter",
        access_type: "admin_live_test",
        is_internal_test: "true",
        user_id: user.id,
        email: user.email,
        user_email: user.email,
        validity_days: String(adminLiveTestValidityDays),
        access_duration_days: String(adminLiveTestValidityDays),
        source: "querycite_admin_billing",
      },
    });

    return NextResponse.json(checkoutData);
  } catch (error) {
    console.error("Admin Razorpay live test order creation failed", error);
    const message = error instanceof Error ? error.message : "Razorpay payment is temporarily unavailable.";
    const safeMessage = /RAZORPAY_|NEXT_PUBLIC_RAZORPAY/.test(message)
      ? "Secure payment is not configured yet."
      : message;

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
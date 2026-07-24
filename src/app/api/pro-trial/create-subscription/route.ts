import { NextResponse } from "next/server";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { claimFirst20ProTrialSlot, savePendingProTrialSubscription, trialEndFrom } from "@/lib/pro-trial";
import { createRazorpayFutureStartSubscription } from "@/lib/razorpay";
import { normalizeWebsiteUrl } from "@/lib/url";

export const runtime = "nodejs";

type CreateTrialRequest = {
  company_name?: unknown;
  website_url?: unknown;
};

const loginRequiredMessage = "Please create an account or log in before starting the Pro trial.";

function compactText(value: unknown, max = 180) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: loginRequiredMessage, code: "login_required" }, { status: 401 });
    await syncAuthenticatedUser(user);

    const body = (await request.json().catch(() => ({}))) as CreateTrialRequest;
    const companyName = compactText(body.company_name, 120) || (user.name ? `${user.name}'s company` : "QueryCite trial company");
    const websiteUrlInput = compactText(body.website_url, 240);
    const websiteUrl = websiteUrlInput ? normalizeWebsiteUrl(websiteUrlInput) : undefined;
    if (websiteUrlInput && !websiteUrl) {
      return NextResponse.json({ error: "Please enter a valid website, for example byldgroup.com" }, { status: 400 });
    }

    const allocationId = await claimFirst20ProTrialSlot(user, companyName);
    const trialStartedAt = new Date().toISOString();
    const trialEndsAt = trialEndFrom(new Date(trialStartedAt));
    const checkoutData = await createRazorpayFutureStartSubscription({
      plan: "pro",
      name: user.name || companyName,
      email: user.email,
      userId: user.id,
      companyName,
      websiteUrl: websiteUrl || undefined,
      allocationId,
      trialStartedAt,
      trialEndsAt,
    });

    await savePendingProTrialSubscription({
      allocationId,
      user,
      companyName,
      razorpayCustomerId: checkoutData.customer_id,
      razorpaySubscriptionId: checkoutData.subscription_id,
      trialStartedAt,
      trialEndsAt,
    });

    return NextResponse.json(checkoutData);
  } catch (error) {
    console.error("First 20 Pro trial subscription creation failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    const message = error instanceof Error ? error.message : "Pro trial checkout is temporarily unavailable.";
    const safeMessage = /RAZORPAY_|NEXT_PUBLIC_RAZORPAY/.test(message) ? "Pro trial checkout is not configured yet." : message;
    const status = message.includes("already claimed") || message.includes("allocation is full") ? 409 : 500;
    return NextResponse.json({ error: safeMessage }, { status });
  }
}


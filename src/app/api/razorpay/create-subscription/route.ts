import { NextResponse } from "next/server";
import { createRazorpaySubscription, isRazorpayPlanName } from "@/lib/razorpay";
import { normalizeWebsiteUrl } from "@/lib/url";

export const runtime = "nodejs";

type CreateSubscriptionRequest = {
  plan?: unknown;
  name?: string;
  email?: string;
  website_url?: string;
  company_name?: string;
};

function compactText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateSubscriptionRequest;
    const plan = body.plan;

    if (!isRazorpayPlanName(plan)) {
      return NextResponse.json({ error: "Please select a valid QueryCite test plan." }, { status: 400 });
    }

    const websiteUrlInput = compactText(body.website_url);
    const websiteUrl = websiteUrlInput ? normalizeWebsiteUrl(websiteUrlInput) : undefined;

    if (websiteUrlInput && !websiteUrl) {
      return NextResponse.json({ error: "Please enter a valid website, for example byldgroup.com" }, { status: 400 });
    }

    const checkoutData = await createRazorpaySubscription({
      plan,
      name: compactText(body.name) || undefined,
      email: compactText(body.email).toLowerCase() || undefined,
      websiteUrl: websiteUrl || undefined,
      companyName: compactText(body.company_name) || undefined,
    });

    return NextResponse.json(checkoutData);
  } catch (error) {
    console.error("Razorpay test subscription creation failed", error);
    const message = error instanceof Error ? error.message : "Secure checkout is temporarily unavailable.";
    const safeMessage = /RAZORPAY_|NEXT_PUBLIC_RAZORPAY/.test(message)
      ? "Secure checkout is not configured yet."
      : message;

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
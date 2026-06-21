import { NextResponse } from "next/server";
import { createRazorpayOrder, isRazorpayPlanName } from "@/lib/razorpay";
import { normalizeWebsiteUrl } from "@/lib/url";

export const runtime = "nodejs";

type CreateOrderRequest = {
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
    const body = (await request.json()) as CreateOrderRequest;
    const plan = body.plan;

    if (!isRazorpayPlanName(plan)) {
      return NextResponse.json({ error: "Please select a valid QueryCite test plan." }, { status: 400 });
    }

    const websiteUrlInput = compactText(body.website_url);
    const websiteUrl = websiteUrlInput ? normalizeWebsiteUrl(websiteUrlInput) : undefined;

    if (websiteUrlInput && !websiteUrl) {
      return NextResponse.json({ error: "Please enter a valid website, for example byldgroup.com" }, { status: 400 });
    }

    const checkoutData = await createRazorpayOrder({
      plan,
      name: compactText(body.name) || undefined,
      email: compactText(body.email).toLowerCase() || undefined,
      websiteUrl: websiteUrl || undefined,
      companyName: compactText(body.company_name) || undefined,
    });

    return NextResponse.json(checkoutData);
  } catch (error) {
    console.error("Razorpay test order creation failed", error);
    const message = error instanceof Error ? error.message : "Razorpay test payment is temporarily unavailable.";
    const safeMessage = /RAZORPAY_|NEXT_PUBLIC_RAZORPAY/.test(message)
      ? "Razorpay test payment is not configured yet. Add the required Test Mode environment variables."
      : message;

    return NextResponse.json({ error: safeMessage }, { status: 500 });
  }
}
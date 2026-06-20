import crypto from "node:crypto";

export type RazorpayPlanName = "starter" | "pro" | "agency";

export type RazorpaySubscriptionInput = {
  plan: RazorpayPlanName;
  name?: string;
  email?: string;
  websiteUrl?: string;
  companyName?: string;
};

export type RazorpaySubscriptionCheckoutData = {
  key_id: string;
  subscription_id: string;
  plan_name: RazorpayPlanName;
  prefill: {
    name?: string;
    email?: string;
  };
};

const razorpayApiBase = "https://api.razorpay.com/v1";

const planEnvMap: Record<RazorpayPlanName, string> = {
  starter: "RAZORPAY_STARTER_PLAN_ID",
  pro: "RAZORPAY_PRO_PLAN_ID",
  agency: "RAZORPAY_AGENCY_PLAN_ID",
};

export function isRazorpayPlanName(value: unknown): value is RazorpayPlanName {
  return value === "starter" || value === "pro" || value === "agency";
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getRazorpayPublicKeyId() {
  return getRequiredEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID");
}

export function getRazorpayWebhookSecret() {
  return getRequiredEnv("RAZORPAY_WEBHOOK_SECRET");
}

export function getRazorpayPlanId(plan: RazorpayPlanName) {
  return getRequiredEnv(planEnvMap[plan]);
}

export function assertRazorpayServerConfigured(plan?: RazorpayPlanName) {
  getRequiredEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID");
  getRequiredEnv("RAZORPAY_KEY_SECRET");
  if (plan) getRazorpayPlanId(plan);
}

function getBasicAuthHeader() {
  const keyId = getRequiredEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID");
  const keySecret = getRequiredEnv("RAZORPAY_KEY_SECRET");
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export async function createRazorpaySubscription(input: RazorpaySubscriptionInput): Promise<RazorpaySubscriptionCheckoutData> {
  assertRazorpayServerConfigured(input.plan);
  const planId = getRazorpayPlanId(input.plan);
  const keyId = getRazorpayPublicKeyId();

  const response = await fetch(`${razorpayApiBase}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: 120,
      quantity: 1,
      customer_notify: 1,
      notes: {
        product: "querycite",
        plan_name: input.plan,
        website_url: input.websiteUrl || "",
        company_name: input.companyName || "",
        source: "querycite_pricing",
      },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.description || "Could not create Razorpay test subscription.");
  }

  return {
    key_id: keyId,
    subscription_id: data.id,
    plan_name: input.plan,
    prefill: {
      name: input.name,
      email: input.email,
    },
  };
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false;
  const secret = getRazorpayWebhookSecret();
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuffer = Buffer.from(expected, "utf8");
  const signatureBuffer = Buffer.from(signature, "utf8");
  return expectedBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

export function unixSecondsToIso(value: unknown) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return new Date(value * 1000).toISOString();
}
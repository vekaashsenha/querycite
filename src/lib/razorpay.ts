import crypto from "node:crypto";

export type RazorpayPlanName = "starter" | "pro" | "agency";

export type RazorpaySubscriptionInput = {
  plan: RazorpayPlanName;
  name?: string;
  email?: string;
  websiteUrl?: string;
  companyName?: string;
};

export type RazorpayOrderInput = RazorpaySubscriptionInput & {
  amount?: number;
  couponCode?: string;
  couponFinalAmount?: number;
  couponType?: string;
  paymentType?: "one_time_beta" | "one_time_test";
  userId?: string;
  accessDurationDays?: number;
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

export type RazorpayOrderCheckoutData = {
  key_id: string;
  order_id: string;
  amount: number;
  currency: "INR";
  plan_name: RazorpayPlanName;
  notes: Record<string, string>;
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

const oneTimeOrderPrices: Record<RazorpayPlanName, number> = {
  starter: 149900,
  pro: 499900,
  agency: 999900,
};

export function isRazorpayPlanName(value: unknown): value is RazorpayPlanName {
  return value === "starter" || value === "pro" || value === "agency";
}

export function getOneTimeOrderAmount(plan: RazorpayPlanName) {
  return oneTimeOrderPrices[plan];
}

function getRequiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

export function getRazorpayPublicKeyId() {
  const keyId = getRequiredEnv("NEXT_PUBLIC_RAZORPAY_KEY_ID");
  if (!keyId.startsWith("rzp_test_")) {
    throw new Error("Razorpay Test Mode key is required for QueryCite payment testing.");
  }
  return keyId;
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

export async function createRazorpayOrder(input: RazorpayOrderInput): Promise<RazorpayOrderCheckoutData> {
  assertRazorpayServerConfigured();
  const keyId = getRazorpayPublicKeyId();
  const amount = input.amount ?? getOneTimeOrderAmount(input.plan);
  const couponCode = input.couponCode || "";
  const paymentType = input.paymentType || "one_time_beta";
  const accessDurationDays = input.accessDurationDays ?? 30;
  const notes: Record<string, string> = {
    product: "querycite",
    payment_type: paymentType,
    plan_name: input.plan,
    selected_plan: input.plan,
    website_url: input.websiteUrl || "",
    company_name: input.companyName || "",
    source: "querycite_pricing",
    access_duration_days: String(accessDurationDays),
    user_email: input.email || "",
    email: input.email || "",
    user_id: input.userId || "",
  };

  if (couponCode) {
    notes.coupon_code = couponCode;
    notes.coupon_final_amount = String(input.couponFinalAmount ?? amount);
    notes.coupon_type = input.couponType || "iima_beta";
  }

  const response = await fetch(`${razorpayApiBase}/orders`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: "INR",
      receipt: `querycite_${input.plan}_${Date.now()}`.slice(0, 40),
      notes,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; amount?: number; error?: { description?: string } };

  if (!response.ok || !data.id) {
    throw new Error(data.error?.description || "Could not create Razorpay test order.");
  }

  return {
    key_id: keyId,
    order_id: data.id,
    amount: typeof data.amount === "number" ? data.amount : amount,
    currency: "INR",
    plan_name: input.plan,
    notes,
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

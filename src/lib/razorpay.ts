import crypto from "node:crypto";

export type RazorpayPlanName = "starter" | "pro" | "agency";

export type RazorpaySubscriptionInput = {
  plan: RazorpayPlanName;
  name?: string;
  email?: string;
  websiteUrl?: string;
  companyName?: string;
  userId?: string;
};

export type RazorpayOrderInput = RazorpaySubscriptionInput & {
  amount?: number;
  couponCode?: string;
  couponFinalAmountPaise?: number;
  couponType?: string;
  paymentType?: "one_time_beta" | "one_time_test";
  userId?: string;
  accessDurationDays?: number;
  extraNotes?: Record<string, string>;
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

export type RazorpayTrialSubscriptionCheckoutData = RazorpaySubscriptionCheckoutData & {
  customer_id: string | null;
  trial_started_at: string;
  trial_ends_at: string;
  notes: Record<string, string>;
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
  if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
    throw new Error("Razorpay payment configuration is required.");
  }
  return keyId;
}

export function getRazorpayWebhookSecret() {
  return getRequiredEnv("RAZORPAY_WEBHOOK_SECRET");
}

function getRazorpayServerKeyId() {
  const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
  if (!keyId) throw new Error("RAZORPAY_KEY_ID is not configured.");
  if (!keyId.startsWith("rzp_test_") && !keyId.startsWith("rzp_live_")) {
    throw new Error("Razorpay server payment configuration is required.");
  }
  return keyId;
}

export function getRazorpayPlanId(plan: RazorpayPlanName) {
  return getRequiredEnv(planEnvMap[plan]);
}

export function assertRazorpayServerConfigured(plan?: RazorpayPlanName) {
  getRazorpayPublicKeyId();
  getRazorpayServerKeyId();
  getRequiredEnv("RAZORPAY_KEY_SECRET");
  if (plan) getRazorpayPlanId(plan);
}

function getBasicAuthHeader() {
  const keyId = getRazorpayServerKeyId();
  const keySecret = getRequiredEnv("RAZORPAY_KEY_SECRET");
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

type RazorpayCustomerResponse = {
  id?: string;
  error?: { description?: string };
};

export async function createRazorpayCustomer(input: { name?: string; email: string; notes?: Record<string, string> }) {
  assertRazorpayServerConfigured();
  const response = await fetch(`${razorpayApiBase}/customers`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: input.name || input.email,
      email: input.email,
      notes: input.notes || { product: "querycite" },
    }),
  });

  const data = (await response.json().catch(() => ({}))) as RazorpayCustomerResponse;
  if (!response.ok || !data.id) {
    throw new Error(data.error?.description || "Could not create Razorpay customer.");
  }
  return data.id;
}

export async function createRazorpayFutureStartSubscription(input: RazorpaySubscriptionInput & { trialStartedAt: string; trialEndsAt: string; allocationId: string }): Promise<RazorpayTrialSubscriptionCheckoutData> {
  assertRazorpayServerConfigured("pro");
  const planId = getRazorpayPlanId("pro");
  const keyId = getRazorpayPublicKeyId();
  if (!input.email || !input.userId) throw new Error("A logged-in account is required for this trial.");

  const notes: Record<string, string> = {
    product: "querycite",
    plan_name: "pro",
    selected_plan: "pro",
    payment_type: "first_20_pro_trial",
    access_type: "first_20_pro_trial",
    trial_days: "30",
    trial_started_at: input.trialStartedAt,
    trial_ends_at: input.trialEndsAt,
    allocation_id: input.allocationId,
    website_url: input.websiteUrl || "",
    company_name: input.companyName || "",
    user_email: input.email,
    email: input.email,
    user_id: input.userId,
    source: "querycite_first_20_trial",
  };

  const customerId = await createRazorpayCustomer({ name: input.name || input.companyName, email: input.email, notes });
  const response = await fetch(`${razorpayApiBase}/subscriptions`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      customer_id: customerId,
      start_at: Math.max(Math.floor(Date.now() / 1000) + 300, Math.floor(Date.parse(input.trialEndsAt) / 1000)),
      notes,
    }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; error?: { description?: string } };
  if (!response.ok || !data.id) {
    throw new Error(data.error?.description || "Could not create Razorpay trial subscription.");
  }

  return {
    key_id: keyId,
    subscription_id: data.id,
    customer_id: customerId,
    plan_name: "pro",
    trial_started_at: input.trialStartedAt,
    trial_ends_at: input.trialEndsAt,
    notes,
    prefill: {
      name: input.name,
      email: input.email,
    },
  };
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
        user_email: input.email || "",
        email: input.email || "",
        user_id: input.userId || "",
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
    notes.coupon_final_amount_paise = String(input.couponFinalAmountPaise ?? amount);
    notes.coupon_type = input.couponType || "iima_beta";
  }

  Object.assign(notes, input.extraNotes || {});

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

export async function cancelRazorpaySubscription(subscriptionId: string) {
  assertRazorpayServerConfigured();
  const response = await fetch(`${razorpayApiBase}/subscriptions/${encodeURIComponent(subscriptionId)}/cancel`, {
    method: "POST",
    headers: {
      Authorization: getBasicAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ cancel_at_cycle_end: 1 }),
  });

  const data = (await response.json().catch(() => ({}))) as { id?: string; status?: string; error?: { description?: string } };
  if (!response.ok) {
    throw new Error(data.error?.description || "Could not cancel Razorpay subscription.");
  }
  return data;
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

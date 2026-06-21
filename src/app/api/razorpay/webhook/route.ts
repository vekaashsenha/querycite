import { NextResponse } from "next/server";
import { getAdminNotificationEmail } from "@/lib/email/resend";
import { paymentFailedUserTemplate, paymentSuccessUserTemplate, subscriptionActiveUserTemplate, subscriptionStatusChangedUserTemplate } from "@/lib/email/templates";
import { sendTransactionalEmail } from "@/lib/email/sendTransactionalEmail";
import { unixSecondsToIso, verifyRazorpayWebhookSignature } from "@/lib/razorpay";
import { insertSupabaseRow, isSupabaseAdminConfigured, selectSupabaseRows, updateSupabaseRows } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type JsonRecord = Record<string, unknown>;

type StoredSubscription = {
  id?: string;
  razorpay_subscription_id?: string;
};

type StoredPayment = {
  id?: string;
  razorpay_payment_id?: string;
};

const handledEvents = new Set([
  "subscription.authenticated",
  "subscription.activated",
  "subscription.charged",
  "subscription.pending",
  "subscription.halted",
  "subscription.cancelled",
  "subscription.completed",
  "subscription.expired",
  "payment.captured",
  "payment.failed",
]);

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function entityFromPayload(payload: JsonRecord, key: "subscription" | "payment") {
  return asRecord(asRecord(asRecord(payload.payload)[key]).entity);
}

function notesFrom(entity: JsonRecord) {
  return asRecord(entity.notes);
}

function planNameFrom(subscription: JsonRecord, payment: JsonRecord) {
  return text(notesFrom(subscription).plan_name) || text(notesFrom(payment).plan_name) || "starter";
}

function paymentTypeFrom(subscription: JsonRecord, payment: JsonRecord) {
  const explicitPaymentType = text(notesFrom(payment).payment_type) || text(notesFrom(subscription).payment_type);
  if (explicitPaymentType) return explicitPaymentType;
  if (text(payment.subscription_id) || text(subscription.id)) return "subscription_test";
  if (text(payment.order_id)) return "one_time_test";
  return "unknown";
}

function websiteFrom(subscription: JsonRecord, payment: JsonRecord) {
  return text(notesFrom(subscription).website_url) || text(notesFrom(payment).website_url);
}

function emailFrom(subscription: JsonRecord, payment: JsonRecord) {
  return text(payment.email) || text(subscription.email) || text(notesFrom(subscription).email) || text(notesFrom(payment).email);
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.querycite.com";
}

function reportUrlFor(subscriptionId: string | null) {
  const params = subscriptionId ? `?subscription_id=${encodeURIComponent(subscriptionId)}` : "";
  return `${getAppBaseUrl()}/report${params}`;
}

function currentPeriodAllowsAccess(currentPeriodEnd: string | null) {
  return Boolean(currentPeriodEnd && Date.parse(currentPeriodEnd) > Date.now());
}

function mapSubscriptionAccess(eventName: string, subscription: JsonRecord) {
  const currentPeriodEnd = unixSecondsToIso(subscription.current_end);

  if (["subscription.authenticated", "subscription.activated", "subscription.charged"].includes(eventName)) {
    return { status: "active", paidAccess: true, currentPeriodEnd };
  }

  if (eventName === "subscription.pending") {
    return { status: "pending", paidAccess: currentPeriodAllowsAccess(currentPeriodEnd), currentPeriodEnd };
  }

  if (eventName === "subscription.cancelled") {
    return { status: "cancelled", paidAccess: currentPeriodAllowsAccess(currentPeriodEnd), currentPeriodEnd };
  }

  if (eventName === "subscription.halted") {
    return { status: "halted", paidAccess: false, currentPeriodEnd };
  }

  return { status: "expired", paidAccess: false, currentPeriodEnd };
}

async function upsertSubscription(payload: JsonRecord, eventName: string) {
  if (!isSupabaseAdminConfigured()) return null;

  const subscription = entityFromPayload(payload, "subscription");
  const payment = entityFromPayload(payload, "payment");
  const subscriptionId = text(subscription.id) || text(payment.subscription_id);
  if (!subscriptionId) return null;

  const access = mapSubscriptionAccess(eventName, subscription);
  const now = new Date().toISOString();
  const row = {
    email: emailFrom(subscription, payment),
    plan_name: planNameFrom(subscription, payment),
    status: access.status,
    provider: "razorpay",
    product: "querycite",
    provider_customer_id: text(subscription.customer_id) || text(payment.customer_id),
    provider_subscription_id: subscriptionId,
    razorpay_customer_id: text(subscription.customer_id) || text(payment.customer_id),
    razorpay_subscription_id: subscriptionId,
    paid_access: access.paidAccess,
    current_period_start: unixSecondsToIso(subscription.current_start),
    current_period_end: access.currentPeriodEnd,
    renewal_date: unixSecondsToIso(subscription.charge_at),
    next_billing_date: unixSecondsToIso(subscription.charge_at),
    cancel_at_period_end: eventName === "subscription.cancelled",
    failed_payment_count: eventName === "payment.failed" ? 1 : 0,
    website_url: websiteFrom(subscription, payment),
    raw_event: payload,
    metadata: { event: eventName, notes: notesFrom(subscription) },
    updated_at: now,
  };

  const existing = await selectSupabaseRows<StoredSubscription>("subscriptions", {
    select: "id",
    razorpay_subscription_id: `eq.${subscriptionId}`,
    limit: "1",
  });

  if (existing[0]?.id) {
    const updated = await updateSupabaseRows("subscriptions", { id: `eq.${existing[0].id}` }, row);
    return updated[0]?.id ?? existing[0].id;
  }

  const inserted = await insertSupabaseRow("subscriptions", {
    ...row,
    created_at: now,
  });
  return inserted[0]?.id ?? null;
}

async function upsertPayment(payload: JsonRecord, eventName: string, subscriptionRowId: string | null) {
  if (!isSupabaseAdminConfigured()) return null;

  const subscription = entityFromPayload(payload, "subscription");
  const payment = entityFromPayload(payload, "payment");
  const paymentId = text(payment.id);
  if (!paymentId) return null;

  const now = new Date().toISOString();
  const row = {
    subscription_id: subscriptionRowId,
    provider: "razorpay",
    provider_payment_id: paymentId,
    provider_invoice_id: text(payment.invoice_id),
    razorpay_payment_id: paymentId,
    razorpay_order_id: text(payment.order_id),
    razorpay_subscription_id: text(payment.subscription_id) || text(subscription.id),
    razorpay_customer_id: text(payment.customer_id) || text(subscription.customer_id),
    product: "querycite",
    payment_type: paymentTypeFrom(subscription, payment),
    plan_name: planNameFrom(subscription, payment),
    email: emailFrom(subscription, payment),
    amount: numberValue(payment.amount),
    amount_cents: numberValue(payment.amount),
    currency: text(payment.currency) || "INR",
    status: eventName === "payment.failed" ? "failed" : text(payment.status) || "captured",
    event_payload: payload,
    raw_event: payload,
    updated_at: now,
  };

  const existing = await selectSupabaseRows<StoredPayment>("payments", {
    select: "id",
    razorpay_payment_id: `eq.${paymentId}`,
    limit: "1",
  });

  if (existing[0]?.id) {
    const updated = await updateSupabaseRows("payments", { id: `eq.${existing[0].id}` }, row);
    return updated[0]?.id ?? existing[0].id;
  }

  const inserted = await insertSupabaseRow("payments", {
    ...row,
    created_at: now,
  });
  return inserted[0]?.id ?? null;
}

async function sendWebhookEmails(payload: JsonRecord, eventName: string, subscriptionRowId: string | null, paymentRowId: string | null) {
  const subscription = entityFromPayload(payload, "subscription");
  const payment = entityFromPayload(payload, "payment");
  const recipient = emailFrom(subscription, payment);
  const planName = planNameFrom(subscription, payment);
  const subscriptionId = text(subscription.id) || text(payment.subscription_id);
  const paymentId = text(payment.id);
  const paymentType = paymentTypeFrom(subscription, payment);
  const hasFullReportAccess = paymentType !== "one_time_test" && Boolean(subscriptionId);
  const data = {
    email: recipient,
    planName,
    subscriptionId,
    paymentId,
    status: text(subscription.status) || text(payment.status) || eventName,
    amount: numberValue(payment.amount) ? `${numberValue(payment.amount)} ${text(payment.currency) || "INR"}` : null,
    nextBillingDate: unixSecondsToIso(subscription.charge_at),
    reportUrl: reportUrlFor(subscriptionId),
    hasFullReportAccess,
  };
  const emails: Array<Promise<unknown>> = [];

  if (recipient && eventName === "payment.captured") {
    emails.push(sendTransactionalEmail({ to: recipient, type: "payment_success_user", relatedEntityType: "payment", relatedEntityId: paymentRowId, ...paymentSuccessUserTemplate(data) }));
  }

  if (recipient && eventName === "payment.failed") {
    emails.push(sendTransactionalEmail({ to: recipient, type: "payment_failed_user", relatedEntityType: "payment", relatedEntityId: paymentRowId, ...paymentFailedUserTemplate(data) }));
  }

  if (recipient && ["subscription.authenticated", "subscription.activated"].includes(eventName)) {
    emails.push(sendTransactionalEmail({ to: recipient, type: "subscription_active_user", relatedEntityType: "subscription", relatedEntityId: subscriptionRowId, ...subscriptionActiveUserTemplate(data) }));
  }

  if (recipient && ["subscription.cancelled", "subscription.completed", "subscription.expired", "subscription.halted"].includes(eventName)) {
    emails.push(sendTransactionalEmail({ to: recipient, type: "subscription_status_changed_user", relatedEntityType: "subscription", relatedEntityId: subscriptionRowId, ...subscriptionStatusChangedUserTemplate(data) }));
  }

  if (!recipient && ["payment.failed", "subscription.halted"].includes(eventName)) {
    emails.push(sendTransactionalEmail({
      to: getAdminNotificationEmail(),
      type: "subscription_status_changed_user",
      relatedEntityType: "razorpay_webhook",
      relatedEntityId: subscriptionId || paymentId,
      ...subscriptionStatusChangedUserTemplate({ ...data, email: "admin", status: `${eventName} without recipient email` }),
    }));
  }

  await Promise.allSettled(emails);
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  try {
    if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid Razorpay webhook signature." }, { status: 401 });
    }
  } catch (error) {
    console.error("Razorpay webhook signature verification failed", error);
    return NextResponse.json({ error: "Razorpay webhook verification is not configured." }, { status: 500 });
  }

  let payload: JsonRecord;
  try {
    payload = JSON.parse(rawBody) as JsonRecord;
  } catch {
    return NextResponse.json({ error: "Invalid Razorpay webhook payload." }, { status: 400 });
  }

  const eventName = text(payload.event) || "unknown";
  if (!handledEvents.has(eventName)) {
    return NextResponse.json({ ok: true, ignored: true, event: eventName });
  }

  try {
    const subscriptionRowId = eventName.startsWith("subscription.") || eventName.startsWith("payment.")
      ? await upsertSubscription(payload, eventName)
      : null;
    const paymentRowId = eventName.startsWith("payment.") || eventName === "subscription.charged"
      ? await upsertPayment(payload, eventName, subscriptionRowId)
      : null;

    await sendWebhookEmails(payload, eventName, subscriptionRowId, paymentRowId);

    return NextResponse.json({ ok: true, event: eventName, stored: isSupabaseAdminConfigured() });
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json({ error: "Razorpay webhook processing failed." }, { status: 500 });
  }
}
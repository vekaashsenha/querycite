import { NextResponse } from "next/server";
import {
  countSuccessfulIimaRedemptions,
  getIimaCouponRedemptions,
  IIMA_BETA_CAMPAIGN_CAPACITY,
  isIimaBetaCouponCode,
  isSuccessfulCouponRedemptionStatus,
  normalizeCouponCode,
  userAlreadyRedeemedIimaCoupon,
} from "@/lib/coupons";
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
  razorpay_order_id?: string;
  status?: string | null;
  paid_access?: boolean | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  access_starts_at?: string | null;
  access_ends_at?: string | null;
};

type StoredPayment = {
  id?: string;
  razorpay_payment_id?: string;
};

type CouponCodeRow = {
  id?: string;
  code?: string;
  redeemed_count?: number | null;
  is_active?: boolean | null;
  expires_at?: string | null;
};

type CouponRedemptionRow = {
  id?: string;
  user_id?: string | null;
  email?: string | null;
  razorpay_payment_id?: string | null;
  status?: string | null;
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
  return typeof value === "string" && value.trim() ? value.trim() : null;
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

function noteText(subscription: JsonRecord, payment: JsonRecord, key: string) {
  return text(notesFrom(payment)[key]) || text(notesFrom(subscription)[key]);
}

function planNameFrom(subscription: JsonRecord, payment: JsonRecord) {
  return noteText(subscription, payment, "plan_name") || noteText(subscription, payment, "selected_plan") || "starter";
}

function accessTypeFrom(subscription: JsonRecord, payment: JsonRecord) {
  return noteText(subscription, payment, "access_type");
}

function isAdminLiveTest(subscription: JsonRecord, payment: JsonRecord) {
  return accessTypeFrom(subscription, payment) === "admin_live_test" || noteText(subscription, payment, "payment_type") === "admin_live_test";
}

function paymentTypeFrom(subscription: JsonRecord, payment: JsonRecord) {
  if (isAdminLiveTest(subscription, payment)) return "admin_live_test";
  const explicitPaymentType = noteText(subscription, payment, "payment_type");
  if (explicitPaymentType) return explicitPaymentType;
  if (text(payment.subscription_id) || text(subscription.id)) return "subscription_test";
  if (text(payment.order_id)) return "one_time_test";
  return "unknown";
}

function websiteFrom(subscription: JsonRecord, payment: JsonRecord) {
  return noteText(subscription, payment, "website_url");
}

function emailFrom(subscription: JsonRecord, payment: JsonRecord) {
  return text(payment.email) || text(subscription.email) || noteText(subscription, payment, "email") || noteText(subscription, payment, "user_email");
}

function userIdFrom(subscription: JsonRecord, payment: JsonRecord) {
  return noteText(subscription, payment, "user_id");
}

function couponCodeFrom(subscription: JsonRecord, payment: JsonRecord) {
  const code = noteText(subscription, payment, "coupon_code");
  return code ? normalizeCouponCode(code) : null;
}

function couponExpired(expiresAt: string | null | undefined) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.now());
}

function capturedAtFrom(payload: JsonRecord, payment: JsonRecord) {
  const iso = unixSecondsToIso(payment.created_at) || unixSecondsToIso(payload.created_at);
  return iso ? new Date(iso) : new Date();
}

function accessWindowForDuration(startsAt: Date, days: number) {
  const endsAt = new Date(startsAt);
  endsAt.setDate(endsAt.getDate() + days);
  return { startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString() };
}

async function protectedOneTimeAccessWindow(payload: JsonRecord, subscription: JsonRecord, payment: JsonRecord, orderId: string, userId: string | null, email: string | null) {
  const capturedAt = capturedAtFrom(payload, payment);
  const days = Number(noteText(subscription, payment, "access_duration_days") || 30);
  const durationDays = Number.isFinite(days) && days > 0 ? days : 30;
  if (!userId && !email) return accessWindowForDuration(capturedAt, durationDays);

  const rows = await selectSupabaseRows<StoredSubscription>("subscriptions", {
    select: "id,razorpay_order_id,status,paid_access,current_period_start,current_period_end,access_starts_at,access_ends_at",
    or: userId ? `(user_id.eq.${userId},email.eq.${email || ""})` : `(email.eq.${email || ""})`,
    order: "updated_at.desc",
    limit: "50",
  });
  const futureEnd = rows
    .filter((row) => row.razorpay_order_id !== orderId && row.paid_access === true && row.status === "active")
    .map((row) => row.access_ends_at ?? row.current_period_end)
    .filter((value): value is string => Boolean(value && Date.parse(value) > capturedAt.getTime()))
    .sort((left, right) => Date.parse(right) - Date.parse(left))[0];

  return accessWindowForDuration(futureEnd ? new Date(futureEnd) : capturedAt, durationDays);
}

async function storedAccessWindow(subscriptionRowId: string | null) {
  if (!subscriptionRowId) return null;
  const rows = await selectSupabaseRows<StoredSubscription>("subscriptions", {
    select: "id,current_period_start,current_period_end,access_starts_at,access_ends_at",
    id: `eq.${subscriptionRowId}`,
    limit: "1",
  });
  const row = rows[0];
  const startsAt = row?.access_starts_at ?? row?.current_period_start ?? null;
  const endsAt = row?.access_ends_at ?? row?.current_period_end ?? null;
  return startsAt && endsAt ? { startsAt, endsAt } : null;
}

function getAppBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://www.querycite.com";
}

function reportUrlFor() {
  return `${getAppBaseUrl()}/dashboard`;
}

function currentPeriodAllowsAccess(currentPeriodEnd: string | null) {
  return Boolean(currentPeriodEnd && Date.parse(currentPeriodEnd) > Date.now());
}

async function getCoupon(code: string) {
  const rows = await selectSupabaseRows<CouponCodeRow>("coupon_codes", {
    select: "id,code,redeemed_count,is_active,expires_at",
    code: `eq.${code}`,
    limit: "1",
  });
  return rows[0] ?? null;
}

async function couponAllowsCapturedAccess(code: string | null, userId: string | null, email: string | null, paymentId: string | null) {
  if (!code) return Boolean(userId);
  if (!userId) return false;
  if (!isSupabaseAdminConfigured() || !isIimaBetaCouponCode(code)) return false;

  const redemptions = await getIimaCouponRedemptions();
  if (paymentId && redemptions.some((redemption) => redemption.razorpay_payment_id === paymentId && isSuccessfulCouponRedemptionStatus(redemption.status))) return true;

  const coupon = await getCoupon(code);
  if (!coupon?.id || coupon.is_active !== true || couponExpired(coupon.expires_at)) return false;
  if (userAlreadyRedeemedIimaCoupon(redemptions, userId, email)) return false;

  return countSuccessfulIimaRedemptions(redemptions) < IIMA_BETA_CAMPAIGN_CAPACITY;
}

async function recordCouponRedemption(payload: JsonRecord, eventName: string) {
  if (eventName !== "payment.captured" || !isSupabaseAdminConfigured()) return;

  const subscription = entityFromPayload(payload, "subscription");
  const payment = entityFromPayload(payload, "payment");
  const code = couponCodeFrom(subscription, payment);
  const paymentId = text(payment.id);
  const orderId = text(payment.order_id);
  if (!code || !paymentId || !isIimaBetaCouponCode(code)) return;

  const existing = await selectSupabaseRows<CouponRedemptionRow>("coupon_redemptions", {
    select: "id",
    razorpay_payment_id: `eq.${paymentId}`,
    limit: "1",
  });
  if (existing[0]?.id) return;

  const coupon = await getCoupon(code);
  if (!coupon?.id || coupon.is_active !== true || couponExpired(coupon.expires_at)) return;

  const userId = userIdFrom(subscription, payment);
  const email = emailFrom(subscription, payment);
  if (!userId) return;
  const redemptions = await getIimaCouponRedemptions();
  if (userAlreadyRedeemedIimaCoupon(redemptions, userId, email)) return;
  if (countSuccessfulIimaRedemptions(redemptions) >= IIMA_BETA_CAMPAIGN_CAPACITY) return;

  const amount = numberValue(payment.amount) ?? 0;
  const capturedAt = capturedAtFrom(payload, payment).toISOString();
  await insertSupabaseRow("coupon_redemptions", {
    coupon_id: coupon.id,
    code,
    user_id: userId,
    email,
    razorpay_payment_id: paymentId,
    razorpay_order_id: orderId,
    amount_paise: amount,
    currency: text(payment.currency) || "INR",
    status: "captured",
    redeemed_at: capturedAt,
    created_at: capturedAt,
  });

  await updateSupabaseRows("coupon_codes", { id: `eq.${coupon.id}` }, {
    redeemed_count: (coupon.redeemed_count ?? 0) + 1,
    updated_at: new Date().toISOString(),
  });
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
  const now = new Date().toISOString();

  if (!subscriptionId) {
    const paymentType = paymentTypeFrom(subscription, payment);
    const orderId = text(payment.order_id);
    const adminLiveTest = isAdminLiveTest(subscription, payment);
    if (!["one_time_beta", "admin_live_test"].includes(paymentType) || !orderId) return null;

    const paymentId = text(payment.id);
    const couponCode = couponCodeFrom(subscription, payment);
    const userId = userIdFrom(subscription, payment);
    const email = emailFrom(subscription, payment);
    const captured = eventName === "payment.captured";
    const amount = numberValue(payment.amount) ?? 0;
    const currency = text(payment.currency) || "INR";
    const hasAccountOwner = Boolean(userId);
    const existing = await selectSupabaseRows<StoredSubscription>("subscriptions", {
      select: "id,razorpay_order_id,current_period_start,current_period_end,access_starts_at,access_ends_at",
      razorpay_order_id: `eq.${orderId}`,
      limit: "1",
    });
    const couponAllows = !adminLiveTest && captured && hasAccountOwner ? await couponAllowsCapturedAccess(couponCode, userId, email, paymentId) : false;
    const adminLiveTestAllows = adminLiveTest && captured && hasAccountOwner && amount === 1000 && currency.toUpperCase() === "INR";
    const paidAccessAllowed = couponAllows || adminLiveTestAllows;
    const existingStartsAt = existing[0]?.access_starts_at ?? existing[0]?.current_period_start ?? null;
    const existingEndsAt = existing[0]?.access_ends_at ?? existing[0]?.current_period_end ?? null;
    const existingWindow = existingStartsAt && existingEndsAt ? { startsAt: existingStartsAt, endsAt: existingEndsAt } : null;
    const accessWindow = captured && paidAccessAllowed
      ? existingWindow ?? await protectedOneTimeAccessWindow(payload, subscription, payment, orderId, userId, email)
      : { startsAt: null, endsAt: null };
    const status = eventName === "payment.failed"
      ? "failed"
      : !hasAccountOwner
        ? "unassigned"
        : captured && paidAccessAllowed
          ? "active"
          : adminLiveTest
            ? "admin_live_test_invalid"
            : couponCode
              ? "coupon_invalid"
              : "pending";

    const row = {
      user_id: userId,
      email,
      plan_name: planNameFrom(subscription, payment),
      status,
      provider: "razorpay",
      product: "querycite",
      provider_customer_id: text(payment.customer_id),
      provider_subscription_id: null,
      razorpay_customer_id: text(payment.customer_id),
      razorpay_subscription_id: null,
      razorpay_order_id: orderId,
      payment_type: paymentType,
      coupon_code: couponCode,
      amount_paise: amount,
      currency,
      paid_access: captured && paidAccessAllowed,
      current_period_start: accessWindow.startsAt,
      current_period_end: accessWindow.endsAt,
      access_starts_at: accessWindow.startsAt,
      access_ends_at: accessWindow.endsAt,
      renewal_date: null,
      next_billing_date: accessWindow.endsAt,
      cancel_at_period_end: false,
      failed_payment_count: eventName === "payment.failed" ? 1 : 0,
      website_url: websiteFrom(subscription, payment),
      raw_event: payload,
      metadata: { event: eventName, notes: notesFrom(payment), access_type: adminLiveTest ? "admin_live_test" : "paid_beta_one_time", internal_test: adminLiveTest },
      updated_at: now,
    };

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

  const access = mapSubscriptionAccess(eventName, subscription);
  const row = {
    user_id: userIdFrom(subscription, payment),
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
  const paymentType = paymentTypeFrom(subscription, payment);
  const captured = eventName === "payment.captured";
  const accessWindow = ["one_time_beta", "admin_live_test"].includes(paymentType) && captured
    ? await storedAccessWindow(subscriptionRowId) ?? { startsAt: null, endsAt: null }
    : { startsAt: null, endsAt: null };
  const row = {
    user_id: userIdFrom(subscription, payment),
    subscription_id: subscriptionRowId,
    provider: "razorpay",
    provider_payment_id: paymentId,
    provider_invoice_id: text(payment.invoice_id),
    razorpay_payment_id: paymentId,
    razorpay_order_id: text(payment.order_id),
    razorpay_subscription_id: text(payment.subscription_id) || text(subscription.id),
    razorpay_customer_id: text(payment.customer_id) || text(subscription.customer_id),
    product: "querycite",
    payment_type: paymentType,
    plan_name: planNameFrom(subscription, payment),
    coupon_code: couponCodeFrom(subscription, payment),
    email: emailFrom(subscription, payment),
    amount: numberValue(payment.amount),
    amount_paise: numberValue(payment.amount),
    amount_cents: numberValue(payment.amount),
    currency: text(payment.currency) || "INR",
    access_starts_at: accessWindow.startsAt,
    access_ends_at: accessWindow.endsAt,
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
  const orderId = text(payment.order_id);
  const paymentType = paymentTypeFrom(subscription, payment);
  const accessWindow = ["one_time_beta", "admin_live_test"].includes(paymentType) && eventName === "payment.captured"
    ? await storedAccessWindow(subscriptionRowId) ?? { startsAt: null, endsAt: null }
    : { startsAt: null, endsAt: null };
  const hasFullReportAccess = ["one_time_beta", "admin_live_test"].includes(paymentType) && eventName === "payment.captured" ? Boolean(accessWindow.endsAt) : paymentType !== "one_time_test" && Boolean(subscriptionId);
  const amount = numberValue(payment.amount);
  const data = {
    email: recipient,
    planName,
    subscriptionId: subscriptionId || orderId,
    paymentId,
    status: text(subscription.status) || text(payment.status) || eventName,
    amount: amount ? `${(amount / 100).toLocaleString("en-IN", { style: "currency", currency: text(payment.currency) || "INR" })}` : null,
    nextBillingDate: unixSecondsToIso(subscription.charge_at) || accessWindow.endsAt,
    reportUrl: reportUrlFor(),
    receiptUrl: paymentRowId ? `${getAppBaseUrl()}/billing/invoices/${paymentRowId}` : null,
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

    await recordCouponRedemption(payload, eventName);
    await sendWebhookEmails(payload, eventName, subscriptionRowId, paymentRowId);

    return NextResponse.json({ ok: true, event: eventName, stored: isSupabaseAdminConfigured() });
  } catch (error) {
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json({ error: "Razorpay webhook processing failed." }, { status: 500 });
  }
}

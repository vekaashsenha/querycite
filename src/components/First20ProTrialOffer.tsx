"use client";

import { useState } from "react";

type ProTrialStatusView = {
  configured: boolean;
  hasAllocation: boolean;
  companyName: string | null;
  plan: "pro";
  status: "trial_pending_authorization" | "trialing" | "active" | "cancelled" | "expired" | "payment_failed" | "unavailable" | "not_claimed";
  trialStartedAt: string | null;
  trialEndsAt: string | null;
  remainingDays: number | null;
  renewalDate: string | null;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  razorpaySubscriptionId: string | null;
  proAccessAllowed: boolean;
  slotsLimit: number;
};

type CheckoutResponse = {
  key_id?: string;
  subscription_id?: string;
  plan_name?: "pro";
  trial_started_at?: string;
  trial_ends_at?: string;
  notes?: Record<string, string>;
  prefill?: { name?: string; email?: string };
  error?: string;
  code?: string;
};

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout is not available on the server."));
  if (window.Razorpay) return Promise.resolve();
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Razorpay Checkout."));
    document.body.appendChild(script);
  });

  return razorpayScriptPromise;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function statusLabel(status: ProTrialStatusView["status"]) {
  if (status === "trial_pending_authorization") return "Awaiting card authorization";
  if (status === "trialing") return "Trial active";
  if (status === "active") return "Paid Pro active";
  if (status === "cancelled") return "Cancelled";
  if (status === "payment_failed") return "Payment failed";
  if (status === "expired") return "Expired";
  return "Not claimed";
}

export function First20ProTrialOffer({ initialStatus, userEmail, defaultCompanyName }: { initialStatus: ProTrialStatusView; userEmail: string; defaultCompanyName?: string | null }) {
  const [trial, setTrial] = useState(initialStatus);
  const [companyName, setCompanyName] = useState(initialStatus.companyName || defaultCompanyName || "");
  const [isLoading, setIsLoading] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const canStart = trial.status === "not_claimed" || trial.status === "payment_failed";
  const canCancel = Boolean(trial.razorpaySubscriptionId && ["trial_pending_authorization", "trialing", "active"].includes(trial.status) && !trial.cancelAtPeriodEnd);

  async function refreshStatus() {
    const response = await fetch("/api/pro-trial/status", { method: "GET" });
    if (response.ok) setTrial((await response.json()) as ProTrialStatusView);
  }

  async function startTrial() {
    setError("");
    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/pro-trial/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company_name: companyName }),
      });
      const data = (await response.json()) as CheckoutResponse;
      if (!response.ok || !data.key_id || !data.subscription_id) {
        throw new Error(data.error || "Pro trial checkout is temporarily unavailable.");
      }

      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error("Razorpay Checkout did not load.");

      const checkout = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: "QueryCite",
        description: "QueryCite Pro 30-day trial authorization",
        prefill: data.prefill,
        notes: data.notes,
        theme: { color: "#2563eb" },
        handler: (checkoutResponse) => {
          const subscriptionId = checkoutResponse.razorpay_subscription_id || data.subscription_id;
          if (!subscriptionId) {
            setError("Trial authorization completed, but the subscription reference was missing. Please contact support.");
            return;
          }
          window.location.href = `/payment/success?subscription_id=${encodeURIComponent(subscriptionId)}`;
        },
        modal: {
          ondismiss: () => {
            setMessage("Card authorization was not completed. You can restart the Pro trial checkout when ready.");
            refreshStatus();
          },
        },
      });
      checkout.open();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Pro trial checkout is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  async function cancelTrial() {
    if (!window.confirm("Cancel this Pro trial renewal? Access can remain until the current trial or paid period ends.")) return;
    setError("");
    setMessage("");
    setIsCancelling(true);
    try {
      const response = await fetch("/api/pro-trial/cancel", { method: "POST" });
      const data = (await response.json()) as { trial?: ProTrialStatusView; error?: string };
      if (!response.ok || !data.trial) throw new Error(data.error || "Could not cancel the trial subscription right now.");
      setTrial(data.trial);
      setMessage("Trial renewal cancellation requested. Access remains until the current trial or paid period ends, when available.");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Could not cancel the trial subscription right now.");
    } finally {
      setIsCancelling(false);
    }
  }

  return (
    <section className="rounded-[1.35rem] border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-cyan-50 p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-blue-700">First 20 companies</p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-950">30 Days of QueryCite Pro - Free</h2>
          <p className="mt-2 text-sm leading-6 text-slate-700">Available to the first 20 companies. Add a card to activate your trial. INR 999/month after 30 days unless cancelled.</p>
          <p className="mt-3 rounded-2xl border border-blue-100 bg-white/80 p-3 text-xs font-semibold leading-5 text-slate-700">A small temporary authorisation amount may be charged and automatically reversed/refunded by Razorpay.</p>
        </div>
        <div className="min-w-56 rounded-2xl border border-white bg-white/85 p-4 text-sm shadow-sm">
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Current status</p>
          <p className="mt-2 text-lg font-semibold text-slate-950">{statusLabel(trial.status)}</p>
          <p className="mt-1 text-sm text-slate-600">{trial.remainingDays !== null ? `${trial.remainingDays} days remaining` : `${trial.slotsLimit} company slots`}</p>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {[
          ["Trial starts", formatDate(trial.trialStartedAt)],
          ["Trial ends", formatDate(trial.trialEndsAt)],
          ["Renewal", formatDate(trial.renewalDate)],
          ["Plan", "Pro"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-white p-4 text-sm">
            <p className="font-semibold text-slate-500">{label}</p>
            <p className="mt-1 font-semibold text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      {canStart ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            Company name
            <input
              type="text"
              value={companyName}
              onChange={(event) => setCompanyName(event.target.value)}
              placeholder="Enter your company name"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
            />
          </label>
          <button type="button" onClick={startTrial} disabled={isLoading} className="inline-flex min-h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-[0_16px_40px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400">
            {isLoading ? "Opening checkout..." : "Activate Pro trial"}
          </button>
        </div>
      ) : null}

      {canCancel ? (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={cancelTrial} disabled={isCancelling} className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:border-slate-500 disabled:cursor-not-allowed disabled:text-slate-400">
            {isCancelling ? "Cancelling..." : "Cancel renewal"}
          </button>
          <p className="text-sm leading-6 text-slate-600">You can cancel before the trial ends to avoid the first paid charge.</p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-2 text-xs font-semibold leading-5 text-slate-600 sm:grid-cols-3">
        <p className="rounded-2xl border border-slate-100 bg-white/75 p-3">Signed in as {userEmail}</p>
        <p className="rounded-2xl border border-slate-100 bg-white/75 p-3">Pro features are unlocked only after Razorpay authorization is confirmed by webhook.</p>
        <p className="rounded-2xl border border-slate-100 bg-white/75 p-3">Trial allocation is limited to one per account/company.</p>
      </div>

      {trial.cancelAtPeriodEnd ? <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold text-amber-900">Cancellation is scheduled. Access remains available until {formatDate(trial.trialEndsAt)} when the current period is still valid.</p> : null}
      {message ? <p className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 p-3 text-sm font-semibold text-cyan-900" aria-live="polite">{message}</p> : null}
      {error ? <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 p-3 text-sm font-semibold text-red-900" aria-live="polite">{error}</p> : null}
    </section>
  );
}



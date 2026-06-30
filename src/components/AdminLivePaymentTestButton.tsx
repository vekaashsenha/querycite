"use client";

import { useState } from "react";

type AdminLiveTestOrderResponse = {
  key_id?: string;
  order_id?: string;
  amount?: number;
  currency?: "INR";
  plan_name?: "starter";
  notes?: Record<string, string>;
  prefill?: {
    name?: string;
    email?: string;
  };
  error?: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayOptions = {
  key: string;
  order_id: string;
  amount?: number;
  currency?: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: { razorpay_order_id?: string }) => void;
  modal?: { ondismiss?: () => void };
};

type RazorpayWindow = Window & {
  Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
};

let razorpayScriptPromise: Promise<void> | null = null;

function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("Checkout is not available on the server."));
  if ((window as RazorpayWindow).Razorpay) return Promise.resolve();
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

export function AdminLivePaymentTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startAdminLiveTest() {
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/admin/razorpay/live-test-order", { method: "POST" });
      const data = (await response.json()) as AdminLiveTestOrderResponse;

      if (!response.ok || !data.key_id || !data.order_id) {
        throw new Error(data.error || "Could not create the admin live test order.");
      }

      const checkoutOrderId = data.order_id;

      await loadRazorpayScript();
      const Razorpay = (window as RazorpayWindow).Razorpay;
      if (!Razorpay) throw new Error("Razorpay Checkout did not load.");

      const checkout = new Razorpay({
        key: data.key_id,
        order_id: checkoutOrderId,
        amount: data.amount,
        currency: data.currency || "INR",
        name: "QueryCite",
        description: "QueryCite admin live payment test - Starter access",
        prefill: data.prefill,
        notes: data.notes,
        theme: { color: "#0f172a" },
        handler: (checkoutResponse) => {
          const orderId = checkoutResponse.razorpay_order_id || checkoutOrderId;
          window.location.href = `/payment/success?order_id=${encodeURIComponent(orderId)}`;
        },
        modal: {
          ondismiss: () => {
            setIsLoading(false);
          },
        },
      });

      checkout.open();
    } catch (adminTestError) {
      setError(adminTestError instanceof Error ? adminTestError.message : "Could not start the admin live payment test.");
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={startAdminLiveTest}
        disabled={isLoading}
        className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        {isLoading ? "Opening Razorpay..." : "Run \u20b910 live test"}
      </button>
      <p className="text-xs font-semibold leading-5 text-slate-500">Temporary admin-only route. This does not use or consume IIMA coupons.</p>
      {error ? <p className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900" aria-live="polite">{error}</p> : null}
    </div>
  );
}
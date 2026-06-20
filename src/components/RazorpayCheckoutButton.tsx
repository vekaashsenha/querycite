"use client";

import { useState } from "react";

type RazorpayPlan = "starter" | "pro" | "agency";

type CheckoutResponse = {
  key_id: string;
  subscription_id: string;
  plan_name: RazorpayPlan;
  prefill?: {
    name?: string;
    email?: string;
  };
  error?: string;
};

type RazorpayCheckoutButtonProps = {
  plan: RazorpayPlan;
  name?: string;
  email?: string;
  websiteUrl?: string;
  companyName?: string;
  className?: string;
};

type RazorpayInstance = {
  open: () => void;
};

type RazorpayOptions = {
  key: string;
  subscription_id: string;
  name: string;
  description: string;
  prefill?: { name?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler: (response: { razorpay_subscription_id?: string }) => void;
  modal?: { ondismiss?: () => void };
};

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

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

export function RazorpayCheckoutButton({ plan, name, email, websiteUrl, companyName, className = "" }: RazorpayCheckoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/razorpay/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          name,
          email,
          website_url: websiteUrl,
          company_name: companyName,
        }),
      });
      const data = (await response.json()) as CheckoutResponse;

      if (!response.ok || !data.subscription_id) {
        throw new Error(data.error || "Razorpay test checkout is temporarily unavailable.");
      }

      await loadRazorpayScript();
      if (!window.Razorpay) throw new Error("Razorpay Checkout did not load.");

      const checkout = new window.Razorpay({
        key: data.key_id,
        subscription_id: data.subscription_id,
        name: "QueryCite",
        description: `QueryCite ${data.plan_name} subscription test checkout`,
        prefill: data.prefill,
        notes: {
          product: "querycite",
          plan_name: data.plan_name,
          source: "querycite_pricing",
        },
        theme: { color: "#0f172a" },
        handler: (checkoutResponse) => {
          const subscriptionId = checkoutResponse.razorpay_subscription_id || data.subscription_id;
          window.location.href = `/payment/success?subscription_id=${encodeURIComponent(subscriptionId)}`;
        },
        modal: {
          ondismiss: () => {
            window.location.href = "/payment/failed";
          },
        },
      });

      checkout.open();
    } catch (checkoutError) {
      setError(checkoutError instanceof Error ? checkoutError.message : "Razorpay test checkout is temporarily unavailable.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-2">
      <button type="button" onClick={startCheckout} disabled={isLoading} className={`inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400 ${className}`}>
        {isLoading ? "Opening test checkout..." : "Start Test Checkout"}
      </button>
      <p className="text-xs font-semibold leading-5 text-slate-500">Payment flow is currently in test mode for private validation.</p>
      {error ? <p className="rounded-2xl border border-amber-100 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900">{error}</p> : null}
    </div>
  );
}
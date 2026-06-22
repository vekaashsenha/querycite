"use client";

import { FormEvent, useState } from "react";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { StatusPill } from "@/components/ui";

type IimaBetaOfferProps = {
  name?: string;
  email?: string;
};

type CouponResponse = {
  valid?: boolean;
  code?: string;
  final_amount_paise?: number;
  currency?: "INR";
  message?: string;
  error?: string;
};

const couponError = "This coupon is invalid, expired, already used, or fully redeemed.";
const successMessage = "IIMA beta offer applied. Final amount: ₹199. Access valid for 1 month.";

export function IimaBetaOffer({ name, email }: IimaBetaOfferProps) {
  const [couponCode, setCouponCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  async function applyCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsValidating(true);
    setMessage("");
    setError("");
    setAppliedCode("");

    try {
      const response = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, selected_plan: "starter", email }),
      });
      const data = (await response.json()) as CouponResponse;

      if (!response.ok || !data.valid || !data.code) {
        throw new Error(data.error || couponError);
      }

      setAppliedCode(data.code);
      setCouponCode(data.code);
      setMessage(data.message || successMessage);
    } catch (couponApplyError) {
      setError(couponApplyError instanceof Error ? couponApplyError.message : couponError);
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <section className="mx-auto mt-8 max-w-6xl overflow-hidden rounded-3xl border border-cyan-200 bg-gradient-to-r from-cyan-50 via-white to-violet-50 p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr] lg:items-center">
        <div>
          <StatusPill tone="cyan">Cohort beta access</StatusPill>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">Exclusive IIMA Beta Offer</h2>
          <div className="mt-4 grid gap-2 text-sm font-semibold leading-6 text-slate-700">
            <p>For AGMP18 and DMBPT02 cohort members</p>
            <p>$2 equivalent</p>
            <p className="text-slate-950">Pay ₹199 for 1-month paid beta access</p>
          </div>
          <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">Use only the cohort code shared with you. This cohort beta access is privately shared for feedback.</p>
        </div>

        <div className="rounded-3xl border border-white/80 bg-white p-5 shadow-sm">
          <form onSubmit={applyCoupon} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="text"
              value={couponCode}
              onChange={(event) => {
                setCouponCode(event.target.value.toUpperCase());
                setMessage("");
                setError("");
                setAppliedCode("");
              }}
              placeholder="Enter coupon code"
              className="min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
            />
            <button type="submit" disabled={isValidating || couponCode.trim().length === 0} className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
              {isValidating ? "Applying..." : "Apply"}
            </button>
          </form>

          <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-500">
            <span className="rounded-full bg-slate-100 px-3 py-1">IIMA-AGMP18</span>
            <span className="rounded-full bg-slate-100 px-3 py-1">IIMA-DMBPT02</span>
          </div>

          {message ? <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-3 text-sm font-semibold leading-6 text-emerald-900">{message}</p> : null}
          {error ? <p className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 p-3 text-sm font-semibold leading-6 text-amber-900">{error}</p> : null}

          {appliedCode ? (
            <div className="mt-5">
              <RazorpayCheckoutButton
                plan="starter"
                mode="order"
                couponCode={appliedCode}
                name={name}
                email={email}
                buttonLabel="Pay ₹199"
                helperText="IIMA beta offer applied. Final amount: ₹199. Access valid for 1 month."
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

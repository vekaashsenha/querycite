"use client";

import { FormEvent, useEffect, useState } from "react";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { PrimaryLink, StatusPill } from "@/components/ui";
import { clearIimaCouponDraft, normalizeIimaCouponDraft, readIimaCouponDraft, saveIimaCouponDraft } from "@/lib/coupon-storage";

type IimaBetaOfferProps = {
  name?: string;
  email?: string;
  isAuthenticated?: boolean;
  hasActivePaidAccess?: boolean;
  couponAlreadyUsed?: boolean;
};

type CouponResponse = {
  valid?: boolean;
  code?: string;
  final_amount_paise?: number;
  currency?: "INR";
  message?: string;
  error?: string;
  reason?: string;
};

const couponError = "This coupon is invalid, expired, already used, or fully redeemed.";
const iimaBetaPriceLabel = "\u20B9199";
const defaultSuccessMessage = `IIMA beta offer applied. Final amount: ${iimaBetaPriceLabel}. Access valid for 1 month.`;
const loginRequiredMessage = "Please create an account or log in before payment so we can activate your access.";

function formatCouponAmount(amountPaise?: number) {
  const amount = typeof amountPaise === "number" && Number.isFinite(amountPaise) ? amountPaise : 19900;
  return (amount / 100).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: amount % 100 === 0 ? 0 : 2,
  });
}

export function IimaBetaOffer({ name, email, isAuthenticated = false, hasActivePaidAccess = false, couponAlreadyUsed = false }: IimaBetaOfferProps) {
  const offerUnavailable = hasActivePaidAccess || couponAlreadyUsed;
  const [couponCode, setCouponCode] = useState("");
  const [appliedCode, setAppliedCode] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isValidating, setIsValidating] = useState(false);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (!offerUnavailable) {
        setCouponCode(readIimaCouponDraft());
        return;
      }

      clearIimaCouponDraft();
      setCouponCode("");
      setAppliedCode("");
      setMessage("");
      setError("");
    });

    return () => window.cancelAnimationFrame(frame);
  }, [offerUnavailable]);

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
        if (data.reason === "already_redeemed") {
          clearIimaCouponDraft();
          setCouponCode("");
        }
        throw new Error(data.error || couponError);
      }

      const amountDisplay = formatCouponAmount(data.final_amount_paise);
      const successMessage = data.message || `IIMA beta offer applied. Final amount: ${amountDisplay}. Access valid for 1 month.`;
      setAppliedCode(data.code);
      setMessage(isAuthenticated ? successMessage : `${successMessage} ${loginRequiredMessage}`);
    } catch (couponValidationError) {
      setError(couponValidationError instanceof Error ? couponValidationError.message : couponError);
    } finally {
      setIsValidating(false);
    }
  }

  return (
    <section className="theme-adaptive-soft mx-auto mt-8 max-w-6xl overflow-hidden rounded-3xl border border-cyan-200 p-6 shadow-sm">
      <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr] lg:items-center">
        <div>
          <StatusPill tone="cyan">IIMA beta offer</StatusPill>
          <h2 className="mt-4 text-2xl font-semibold text-slate-950">Exclusive IIMA Beta Offer</h2>
          <p className="mt-2 text-sm font-semibold text-slate-700">For AGMP18 and DMBPT02 cohort members</p>
          <div className="mt-5 flex flex-wrap items-end gap-3">
            <p className="text-3xl font-semibold text-slate-950">{iimaBetaPriceLabel}</p>
            <p className="pb-1 text-sm font-semibold text-slate-500">$2 equivalent</p>
          </div>
          <p className="mt-2 text-sm font-semibold text-slate-950">Pay {iimaBetaPriceLabel} for 1-month paid beta access</p>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs font-semibold text-slate-700">
            {["Full report", "AI Advisor", "1 month"].map((item) => (
              <div key={item} className="qc-surface rounded-2xl border border-white/80 bg-white p-3 shadow-sm">{item}</div>
            ))}
          </div>
        </div>

        <div className="qc-surface rounded-3xl border border-white/80 bg-white p-5 shadow-sm">
          {offerUnavailable ? (
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900">
              <p>{hasActivePaidAccess ? "You already have active paid access." : "This beta offer has already been used for this account."}</p>
              <p className="mt-2 text-xs leading-5 text-emerald-800">Your coupon field has been cleared. Access and receipts remain available from your account.</p>
              <div className="mt-4">
                <PrimaryLink href="/dashboard">Go to Dashboard</PrimaryLink>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={applyCoupon} className="grid gap-3">
                <label htmlFor="cohort-coupon" className="text-sm font-semibold text-slate-700">Enter your cohort coupon code</label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <input
                    id="cohort-coupon"
                    type="text"
                    value={couponCode}
                    onChange={(event) => {
                      const nextCode = normalizeIimaCouponDraft(event.target.value);
                      setCouponCode(nextCode);
                      saveIimaCouponDraft(nextCode);
                      setMessage("");
                      setError("");
                      setAppliedCode("");
                    }}
                    placeholder="Enter coupon code"
                    autoComplete="off"
                    className="qc-input min-h-12 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none transition focus:border-cyan-500 focus:ring-4 focus:ring-cyan-100"
                  />
                  <button type="submit" disabled={isValidating || couponCode.trim().length === 0} className="min-h-12 rounded-2xl bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300">
                    {isValidating ? "Applying..." : "Apply"}
                  </button>
                </div>
              </form>

              <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">Use the private code shared with your cohort. Payment amount and eligibility are verified on the server.</p>

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
                    buttonLabel={`Pay ${iimaBetaPriceLabel}`}
                    helperText={message || defaultSuccessMessage}
                    isAuthenticated={isAuthenticated}
                  />
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
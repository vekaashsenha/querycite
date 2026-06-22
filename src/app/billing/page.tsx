import Link from "next/link";
import { ClayCard, PageIntro, StatusPill } from "@/components/ui";
import { formatPaise, getPaidAccessContextForUser, getPaymentHistoryForUser } from "@/lib/paid-foundation";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function BillingPage() {
  const user = await requireAuthenticatedUser("/billing");
  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);
  const payments = await getPaymentHistoryForUser(user);

  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Billing"
        title="Billing and payment status"
        description="Billing data is visible only after login and is based on verified Razorpay webhook records stored in Supabase. Payment success pages do not unlock access by themselves."
      />
      <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <ClayCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Billing overview</h2>
            <StatusPill tone={access.verifiedPaidAccess ? "green" : "amber"}>{access.verifiedPaidAccess ? "Verified" : "No active access"}</StatusPill>
          </div>
          <div className="mt-6 grid gap-3">
            {[
              ["Signed in", user.email],
              ["Current plan", access.rawPlanName || access.planName],
              ["Payment status", access.status],
              ["Billing period start", formatDate(access.currentPeriodStart)],
              ["Billing period end", formatDate(access.currentPeriodEnd)],
              ["Renewal date", formatDate(access.renewalDate)],
              ["Subscription ID", access.subscriptionId || "-"],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 sm:grid-cols-[0.45fr_1fr]">
                <p className="font-semibold text-slate-950">{label}</p>
                <p className="break-all text-slate-600">{value}</p>
              </div>
            ))}
          </div>
          {!access.verifiedPaidAccess ? <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">No active paid subscription is linked to this account yet.</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">View plans</Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Contact support</Link>
          </div>
        </ClayCard>

        <ClayCard>
          <h2 className="text-2xl font-semibold text-slate-950">Payment history</h2>
          {payments.length ? (
            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100">
              <div className="grid gap-3 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white md:grid-cols-[0.65fr_0.6fr_0.55fr_0.7fr_1fr]">
                <span>Date</span><span>Amount</span><span>Status</span><span>Plan</span><span>Invoice/receipt</span>
              </div>
              {payments.map((payment) => (
                <div key={payment.id} className="grid gap-3 border-t border-slate-100 bg-white px-4 py-4 text-sm leading-6 text-slate-700 md:grid-cols-[0.65fr_0.6fr_0.55fr_0.7fr_1fr]">
                  <span>{formatDate(payment.createdAt)}</span>
                  <span>{formatPaise(payment.amount, payment.currency)}</span>
                  <span>{payment.status}</span>
                  <span>{payment.planName || "-"}</span>
                  <span className="break-all">{payment.providerInvoiceId || payment.razorpayPaymentId || payment.razorpayOrderId || "Not available"}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-600">No payment history rows are linked to this authenticated account yet.</p>
          )}
          <p className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-600">Subscription billing is still handled through verified server-side records. For billing changes, contact support.</p>
        </ClayCard>
      </section>
    </main>
  );
}

import Link from "next/link";
import { DashboardShell, WorkspaceHeader } from "@/components/DashboardShell";
import { AppCard, EmptyState, MetricCard, StatusPill } from "@/components/ui";
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
  const badgeText = access.qaAccess ? "Admin QA access active" : access.isPaidBetaAccess ? "Paid beta access active" : access.isExpiredBetaAccess ? "Paid beta access expired" : access.verifiedPaidAccess ? "Verified" : "No active access";
  const badgeTone = access.qaAccess ? "cyan" : access.isPaidBetaAccess ? "green" : access.isExpiredBetaAccess ? "amber" : access.verifiedPaidAccess ? "green" : "amber";

  return (
    <DashboardShell
      user={{ email: user.email, name: user.name, isAdmin: access.isAdmin }}
      title="Billing"
      description="Plan status, billing period, payment history, and support options based on verified account records."
      badge={<StatusPill tone={badgeTone}>{badgeText}</StatusPill>}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="usage">
        <MetricCard label="Current plan" value={access.rawPlanName || access.planName} detail={access.isPaidBetaAccess ? "Paid beta access" : "Shown from access records"} tone="violet" />
        <MetricCard label="Payment status" value={access.status} detail={access.qaAccess ? "Admin QA access active" : access.isPaidBetaAccess ? "Paid beta access allowed" : access.isExpiredBetaAccess ? "Beta access expired" : access.verifiedPaidAccess ? "Paid access allowed" : "Full access locked"} tone={badgeTone} />
        <MetricCard label="Amount paid" value={formatPaise(access.amountPaise, access.currency)} detail={access.couponCode ? `Coupon: ${access.couponCode}` : "Latest access record"} tone="cyan" />
        <MetricCard label="Access valid until" value={formatDate(access.accessEndsAt ?? access.currentPeriodEnd)} detail={access.isPaidBetaAccess || access.isExpiredBetaAccess ? "1-month paid beta access" : "For billing changes, contact support"} tone="slate" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <AppCard className="p-6">
          <WorkspaceHeader eyebrow="Billing overview" title="Current access details" description="Payment success pages do not unlock access by themselves. Access is based on verified webhook payment and subscription records." />
          <div className="mt-6 grid gap-3">
            {[
              ["Signed in", user.email],
              ["Current plan", access.rawPlanName || access.planName],
              ["Access status", badgeText],
              ["Coupon", access.couponCode || "-"],
              ["Amount paid", formatPaise(access.amountPaise, access.currency)],
              ["Access starts", formatDate(access.accessStartsAt ?? access.currentPeriodStart)],
              ["Access valid until", formatDate(access.accessEndsAt ?? access.currentPeriodEnd)],
              ["Razorpay order/access ID", access.subscriptionId || "-"],
            ].map(([label, value]) => (
              <div key={label} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 sm:grid-cols-[0.45fr_1fr]">
                <p className="font-semibold text-slate-950">{label}</p>
                <p className="break-all text-slate-600">{value}</p>
              </div>
            ))}
          </div>
          {access.couponCode ? <p className="mt-5 rounded-2xl border border-cyan-100 bg-cyan-50 p-4 text-sm font-semibold leading-6 text-cyan-900">This coupon gives 1-month paid beta access only.</p> : null}
          {access.isExpiredBetaAccess ? <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">Paid beta access has expired. Renew, upgrade, or contact support to unlock full reports, exports, competitor comparison, and AI Advisor again.</p> : null}
          <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">For billing changes, contact support.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">View plans</Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Contact support</Link>
          </div>
        </AppCard>

        <AppCard className="p-6">
          <WorkspaceHeader eyebrow="Payment history" title="Recorded payments" description="Rows are shown only when payment records are linked to this authenticated account." />
          {payments.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white md:grid md:grid-cols-[0.58fr_0.52fr_0.5fr_0.62fr_0.72fr_1fr]">
                <span>Date</span><span>Amount</span><span>Status</span><span>Plan</span><span>Coupon</span><span>Access/receipt</span>
              </div>
              {payments.map((payment) => (
                <div key={payment.id} className="grid gap-3 border-t border-slate-100 bg-white px-4 py-4 text-sm leading-6 text-slate-700 md:grid-cols-[0.58fr_0.52fr_0.5fr_0.62fr_0.72fr_1fr]">
                  <span>{formatDate(payment.createdAt)}</span>
                  <span>{formatPaise(payment.amount, payment.currency)}</span>
                  <span>{payment.status}</span>
                  <span>{payment.planName || "-"}</span>
                  <span>{payment.couponCode || "-"}</span>
                  <span className="break-all">{payment.providerInvoiceId || payment.razorpayPaymentId || payment.razorpayOrderId || "Not available"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6"><EmptyState title="No payment history yet" description="No payment records are linked to this authenticated account yet. Payment records will appear here after processing." /></div>
          )}
        </AppCard>
      </section>
    </DashboardShell>
  );
}

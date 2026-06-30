import Link from "next/link";
import { AdminLivePaymentTestButton } from "@/components/AdminLivePaymentTestButton";
import { DashboardShell, WorkspaceHeader } from "@/components/DashboardShell";
import { FeedbackCta } from "@/components/FeedbackCta";
import { AppCard, EmptyState, MetricCard, StatusPill } from "@/components/ui";
import { formatPaise, getPaidAccessContextForUser, getPaymentHistoryForUser, isPaidPaymentRecord } from "@/lib/paid-foundation";
import { getRazorpaySafeDiagnostics } from "@/lib/razorpay";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function BillingPage() {
  const user = await requireAuthenticatedUser("/billing");
  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);
  const payments = await getPaymentHistoryForUser(user);
  const paidPayments = payments.filter(isPaidPaymentRecord);
  const razorpayDiagnostics = access.isAdmin ? getRazorpaySafeDiagnostics() : null;
  const badgeText = access.qaAccess ? "Admin" : access.isPaidBetaAccess ? "Beta active" : access.isExpiredBetaAccess ? "Beta expired" : access.verifiedPaidAccess ? "Paid access active" : "No active access";
  const badgeTone = access.qaAccess ? "cyan" : access.isPaidBetaAccess ? "green" : access.isExpiredBetaAccess ? "amber" : access.verifiedPaidAccess ? "green" : "amber";

  return (
    <DashboardShell
      user={{ email: user.email, name: user.name, isAdmin: access.isAdmin }}
      title="Billing"
      description="Verified access, payment history, and billing support."
      badge={<StatusPill tone={badgeTone}>{badgeText}</StatusPill>}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4" id="usage">
        <MetricCard label="Current plan" value={access.rawPlanName || access.planName} detail={access.verifiedPaidAccess ? "Full report access" : "Free access"} tone="violet" />
        <MetricCard label="Payment status" value={access.status} detail={access.qaAccess ? "Admin access" : access.verifiedPaidAccess ? "Paid access active" : "Full access locked"} tone={badgeTone} />
        <MetricCard label="Amount paid" value={formatPaise(access.amountPaise, access.currency)} detail={access.couponCode ? "Cohort offer applied" : "Most recent payment"} tone="cyan" />
        <MetricCard label="Access active until" value={formatDate(access.accessEndsAt ?? access.currentPeriodEnd)} detail={access.isPaidBetaAccess || access.isExpiredBetaAccess ? "1-month access" : "Current access period"} tone="slate" />
      </section>

      {access.isAdmin ? (
        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <AppCard className="border-cyan-200 bg-cyan-50/70 p-6">
            <WorkspaceHeader
              eyebrow="Admin only"
              title="Admin Live Payment Test"
              description={"Pay \u20b910 to verify live Razorpay payment, webhook, access activation, invoice, and Starter feature unlock."}
            />
            <div className="mt-5">
              <AdminLivePaymentTestButton />
            </div>
          </AppCard>

          <AppCard className="border-slate-200 bg-white p-6">
            <WorkspaceHeader
              eyebrow="Admin only"
              title="Razorpay Configuration"
              description="Safe runtime mode check. Secret values are never shown."
            />
            <div className="mt-5 grid gap-3 text-sm">
              {[
                ["Razorpay public key mode", razorpayDiagnostics?.publicKeyMode ?? "missing"],
                ["Razorpay server key mode", razorpayDiagnostics?.serverKeyMode ?? "missing"],
                ["Webhook secret configured", razorpayDiagnostics?.webhookSecretConfigured ? "yes" : "no"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <span className="font-semibold text-slate-600">{label}</span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-slate-950">{value}</span>
                </div>
              ))}
            </div>
          </AppCard>
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <AppCard className="p-6">
          <WorkspaceHeader eyebrow="Access" title="Current billing details" description="Your plan, payment status, and current access period." />
          <div className="mt-6 grid gap-3">
            {[
              ["Signed in", user.email],
              ["Plan", access.rawPlanName || access.planName],
              ["Status", badgeText],
              ["Offer", access.couponCode ? "IIMA cohort offer" : "—"],
              ["Amount", formatPaise(access.amountPaise, access.currency)],
              ["Starts", formatDate(access.accessStartsAt ?? access.currentPeriodStart)],
              ["Valid until", formatDate(access.accessEndsAt ?? access.currentPeriodEnd)],
              ["Renewal date", formatDate(access.renewalDate ?? access.accessEndsAt ?? access.currentPeriodEnd)],
            ].map(([label, value]) => (
              <div key={label} className="flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm">
                <p className="font-semibold text-slate-500">{label}</p>
                <p className="break-all text-right font-semibold text-slate-950">{value}</p>
              </div>
            ))}
          </div>
          {access.isExpiredBetaAccess ? <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">Paid beta access has expired. Renew to reopen full reports, exports, competitor comparison, and AI Advisor.</p> : null}
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">View plans</Link>
            <Link href="/billing/invoices" target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-full border border-violet-300 bg-violet-50 px-5 text-sm font-semibold text-violet-900">View invoices & receipts</Link>
            <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Contact support</Link>
          </div>
          <FeedbackCta variant="card" className="mt-5" />
        </AppCard>

        <AppCard className="p-6">
          <WorkspaceHeader eyebrow="History" title="Payment history" description="Confirmed payments linked to your account." />
          {paidPayments.length ? (
            <div className="mt-6 grid gap-3">
              {paidPayments.map((payment) => (
                <div key={payment.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm md:grid-cols-[0.7fr_0.65fr_0.55fr_0.7fr_1fr] md:items-center">
                  <span>{formatDate(payment.createdAt)}</span>
                  <span className="font-semibold text-slate-950">{formatPaise(payment.amount, payment.currency)}</span>
                  <span>{payment.status}</span>
                  <span>{payment.couponCode ? "Cohort offer" : payment.planName || "—"}</span>
                  <span className="break-all text-slate-600">{payment.providerInvoiceId || payment.razorpayPaymentId || payment.razorpayOrderId || "Receipt pending"}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6"><EmptyState title="No payment history yet" description="Payment records appear here after processing." /></div>
          )}
        </AppCard>
      </section>
    </DashboardShell>
  );
}

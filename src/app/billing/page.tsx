import Link from "next/link";
import { ClayCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
import { formatPaise, getPaidAccessContext, getPaymentHistoryForPaidContext } from "@/lib/paid-foundation";

type BillingPageProps = {
  searchParams?: Promise<{ subscription_id?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = searchParams ? await searchParams : {};
  const subscriptionId = firstParam(params.subscription_id) ?? null;
  const access = await getPaidAccessContext(subscriptionId);
  const payments = await getPaymentHistoryForPaidContext(access);

  if (!access.verifiedPaidAccess) {
    return (
      <main className="px-5 py-16 sm:px-8">
        <PageIntro
          eyebrow="Billing"
          title="Billing details require verified paid access."
          description="QueryCite uses verified Razorpay webhooks and Supabase subscription status. One-time test payments do not activate long-term paid access."
        />
        <section className="mx-auto mt-10 max-w-4xl">
          <ClayCard>
            <StatusPill tone="amber">No active paid subscription found</StatusPill>
            <p className="mt-4 text-sm leading-6 text-slate-600">For billing changes, contact support.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <PrimaryLink href="/pricing">View Pricing</PrimaryLink>
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:border-slate-950">Contact support</Link>
            </div>
          </ClayCard>
        </section>
      </main>
    );
  }

  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Billing"
        title="Billing and payment status"
        description="Billing data is based on verified Razorpay webhook records stored in Supabase. Automated plan changes are not enabled yet."
      />
      <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <ClayCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Billing overview</h2>
            <StatusPill tone="green">Verified</StatusPill>
          </div>
          <div className="mt-6 grid gap-3">
            {[
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
          <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">For billing changes, contact support.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Upgrade plan</Link>
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
            <p className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-600">No payment history rows are linked to this subscription yet.</p>
          )}
        </ClayCard>
      </section>
    </main>
  );
}
import { ClayCard, PageIntro, StatusPill } from "@/components/ui";

const billingRows = [
  ["Current plan", "Available after account login is enabled"],
  ["Subscription status", "Not connected yet"],
  ["Next billing date", "Available after verified subscription lookup"],
  ["Payment status", "Available after Razorpay webhook verification"],
  ["Invoices", "Placeholder"],
  ["Cancel subscription", "Placeholder"],
];

export default function BillingPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro eyebrow="Billing" title="Billing will be available after account login is enabled." description="QueryCite paid access will use verified Razorpay webhooks and Supabase subscription status. This page does not fake active subscriptions." />
      <section className="mx-auto mt-10 max-w-4xl">
        <ClayCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Billing overview</h2>
            <StatusPill tone="amber">Test mode foundation</StatusPill>
          </div>
          <div className="mt-6 grid gap-3">
            {billingRows.map(([label, value]) => (
              <div key={label} className="grid gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 sm:grid-cols-[0.45fr_1fr]">
                <p className="font-semibold text-slate-950">{label}</p>
                <p className="text-slate-600">{value}</p>
              </div>
            ))}
          </div>
        </ClayCard>
      </section>
    </main>
  );
}
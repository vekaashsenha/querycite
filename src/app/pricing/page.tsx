import { IimaBetaOffer } from "@/components/IimaBetaOffer";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { AppCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/server";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";

const plans = [
  {
    name: "Free",
    price: "$0",
    description: "Limited audit + limited report.",
    bestFor: "A first AI visibility check",
    badge: "Free",
    tone: "green" as const,
    highlighted: false,
    planKey: null,
    cta: "Run Free Audit",
    includes: [
      "1 website",
      "Limited AI visibility audit",
      "Top 3 findings",
      "Limited branded PDF",
      "Basic CSV export",
    ],
  },
  {
    name: "Starter",
    price: "$20/month",
    description: "For founders, freelancers, and solo marketers who want to fix AI visibility gaps themselves.",
    bestFor: "Hands-on AEO/GEO improvement",
    badge: "Most popular",
    tone: "violet" as const,
    highlighted: true,
    planKey: "starter" as const,
    cta: "Choose Starter",
    includes: [
      "1 website",
      "5 audits/month",
      "200 Advisor credits/month",
      "25 blog briefs/month",
      "25 fix packs/month",
      "10 competitor updates/month",
      "PDF/CSV report access",
    ],
  },
  {
    name: "Pro",
    price: "$99/month",
    description: "For serious marketers, consultants, and small teams managing AEO/GEO work.",
    bestFor: "Ongoing AI visibility programs",
    badge: "For teams",
    tone: "cyan" as const,
    highlighted: false,
    planKey: "pro" as const,
    cta: "Choose Pro",
    includes: [
      "5 websites",
      "50 audits/month",
      "1,000 Advisor credits/month",
      "100 blog briefs/month",
      "100 fix packs/month",
      "100 competitor updates/month",
      "Full reports and competitor comparison",
      "Invoices and receipts",
    ],
  },
];

const comparisonRows = [
  ["Websites", "1", "1", "5"],
  ["Audits per month", "Limited", "5", "50"],
  ["AI Advisor", "Preview", "200 credits", "1,000 credits"],
  ["Blog briefs", "Locked", "25", "100"],
  ["Fix packs", "Locked", "25", "100"],
  ["Competitor updates", "Locked", "10", "100"],
  ["Reports", "Limited", "PDF / CSV", "Full reports"],
  ["Competitor comparison", "Preview", "Included", "Included"],
];

export default async function PricingPage() {
  const user = await getCurrentUser();
  const isAuthenticated = Boolean(user);
  const access = user ? await getPaidAccessContextForUser(user) : null;
  const hasActivePaidAccess = Boolean(access?.verifiedPaidAccess);
  const couponAlreadyUsed = Boolean(access?.isExpiredBetaAccess);

  return (
    <main className="marketing-home-light px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Pricing"
        title="Start free. Choose the depth of action you need."
        description="Simple beta pricing for a first website scan, hands-on fixes, or ongoing AI visibility work. No credit card needed to start."
      />
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm font-medium text-slate-500">Billed in your supported currency at checkout. Payment requires an account.</p>

      <section className="mx-auto mt-12 grid max-w-6xl items-start gap-5 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => (
          <AppCard
            key={plan.name}
            className={`relative flex h-full flex-col p-6 ${plan.highlighted ? "border-blue-300 shadow-[0_24px_70px_rgba(37,99,235,0.16)] ring-1 ring-blue-200 lg:-mt-3 lg:pt-8" : ""}`}
          >
            {plan.highlighted ? (
              <span className="absolute -top-3 left-6 inline-flex items-center rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">Most popular</span>
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-950">{plan.name}</h2>
              {!plan.highlighted ? <StatusPill tone={plan.tone}>{plan.badge}</StatusPill> : null}
            </div>
            <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">{plan.price}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{plan.description}</p>
            <p className="mt-4 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">Best for: {plan.bestFor}</p>
            <div className="mt-5 grid gap-2.5">
              {plan.includes.map((item) => (
                <div key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold text-white ${plan.highlighted ? "bg-blue-600" : "bg-slate-900"}`} aria-hidden="true">✓</span>
                  <span className="font-medium">{item}</span>
                </div>
              ))}
            </div>
            <div className="mt-6 flex-1" />
            {plan.planKey ? (
              <RazorpayCheckoutButton
                plan={plan.planKey}
                mode="order"
                name={user?.name ?? undefined}
                email={user?.email}
                isAuthenticated={isAuthenticated}
                buttonLabel={plan.cta}
                helperText="Billed in supported currency at checkout. Access begins after payment confirmation."
              />
            ) : (
              <PrimaryLink href="/#audit">{plan.cta}</PrimaryLink>
            )}
          </AppCard>
        ))}
      </section>

      <section className="qc-surface mx-auto mt-8 max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-2xl font-semibold text-slate-950">Plan comparison</h2>
          <p className="mt-1 text-sm text-slate-600">The beta limits at a glance.</p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.35fr_repeat(3,1fr)] bg-slate-950 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              <span>Feature</span><span>Free</span><span>Starter</span><span>Pro</span>
            </div>
            {comparisonRows.map(([feature, free, starter, pro]) => (
              <div key={feature} className="grid grid-cols-[1.35fr_repeat(3,1fr)] border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">{feature}</span><span>{free}</span><span>{starter}</span><span>{pro}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <IimaBetaOffer name={user?.name ?? undefined} email={user?.email} isAuthenticated={isAuthenticated} hasActivePaidAccess={hasActivePaidAccess} couponAlreadyUsed={couponAlreadyUsed} />

      <section className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-3">
        {[
          ["Verified access", "Paid access begins after Razorpay confirms payment capture."],
          ["Digital delivery", "Reports and access are delivered online, usually within minutes."],
          ["Receipts included", "Confirmed payments appear in your protected billing history."],
        ].map(([title, copy]) => (
          <AppCard key={title} className="p-5">
            <h2 className="font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
          </AppCard>
        ))}
      </section>

      <div className="mx-auto mt-10 flex max-w-6xl justify-center">
        <PrimaryLink href="/#audit">Run Free AI Visibility Audit</PrimaryLink>
      </div>
    </main>
  );
}

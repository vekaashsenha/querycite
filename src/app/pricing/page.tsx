import { IimaBetaOffer } from "@/components/IimaBetaOffer";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { AppCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/server";

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

  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Pricing"
        title="Start free. Choose the depth of action your team needs."
        description="Simple beta pricing for a first audit, hands-on implementation, or ongoing AEO/GEO work."
      />
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm font-semibold text-slate-500">Billed in supported currency at checkout.</p>

      <section className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <AppCard key={plan.name} className={`flex flex-col p-6 ${plan.highlighted ? "border-violet-300 bg-violet-50 shadow-[0_24px_70px_rgba(91,33,182,0.14)]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{plan.name}</h2>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{plan.price}</p>
              </div>
              <StatusPill tone={plan.tone}>{plan.badge}</StatusPill>
            </div>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-700">{plan.description}</p>
            <p className="mt-4 rounded-2xl border border-slate-100 bg-white/80 p-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Best for: {plan.bestFor}</p>
            <div className="mt-5 grid gap-2">
              {plan.includes.map((item) => (
                <div key={item} className="qc-surface flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm font-semibold text-slate-700">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-950 text-[10px] text-white" aria-hidden="true">✓</span>
                  {item}
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

      <IimaBetaOffer name={user?.name ?? undefined} email={user?.email} />

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

import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { ClayCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";

const plans = [
  {
    name: "Free Audit",
    price: "$0",
    bestFor: "First visibility check",
    cta: "Run Free Audit",
    href: "/#audit",
    tone: "green" as const,
    highlighted: false,
    planKey: null,
    includes: [
      "AI Visibility Score",
      "AEO/GEO scores",
      "Top 3 findings",
      "Limited branded PDF",
      "Basic CSV",
      "Locked competitor and advisor preview",
    ],
  },
  {
    name: "Starter",
    price: "$29/month",
    bestFor: "One brand validating the full fix plan",
    tone: "violet" as const,
    highlighted: true,
    planKey: "starter" as const,
    includes: [
      "1 domain",
      "Full report access",
      "AI Visibility Advisor",
      "Ready-to-paste fixes",
      "Developer action notes",
      "Full CSV export",
    ],
  },
  {
    name: "Pro",
    price: "$99/month",
    bestFor: "Teams auditing multiple domains",
    tone: "slate" as const,
    highlighted: false,
    planKey: "pro" as const,
    includes: [
      "3 to 5 domains",
      "Competitor comparison",
      "AI Advisor credits",
      "Full PDF/CSV exports",
      "Shareable report workflow",
      "Report history foundation",
    ],
  },
  {
    name: "Agency",
    price: "From $149/month",
    bestFor: "Agencies running audits for clients",
    tone: "amber" as const,
    highlighted: false,
    planKey: "agency" as const,
    includes: [
      "Up to 10 domains",
      "Client-ready reports",
      "Team sharing later",
      "White-label report option later",
      "Priority roadmap access",
      "Custom support placeholder",
    ],
  },
];

export default function PricingPage() {
  const hasAgencyPlan = Boolean(process.env.RAZORPAY_AGENCY_PLAN_ID);

  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Pricing"
        title="Start with a free audit. Test paid checkout privately."
        description="QueryCite shows your AI visibility gaps for free. Payment flow is currently in test mode for private validation and does not activate paid access until verified by webhook status."
      />
      <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-4">
        {plans.map((plan) => {
          const showCheckout = plan.planKey === "starter" || plan.planKey === "pro" || (plan.planKey === "agency" && hasAgencyPlan);

          return (
            <ClayCard key={plan.name} className={`flex flex-col p-5 ${plan.highlighted ? "border-violet-200 bg-violet-50/70 shadow-[0_24px_70px_rgba(91,33,182,0.14)]" : ""}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold leading-7 text-slate-950">{plan.name}</h2>
                  <p className="mt-2 text-2xl font-semibold leading-8 text-slate-950">{plan.price}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">Best for: {plan.bestFor}</p>
                </div>
                <StatusPill tone={plan.tone}>{plan.planKey ? "Test" : "Free"}</StatusPill>
              </div>

              <div className="mt-5 border-t border-slate-200 pt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">What you get</p>
                <ul className="mt-4 grid gap-2.5">
                  {plan.includes.map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-6 text-slate-700">
                      <span className="mt-2 size-1.5 rounded-full bg-slate-950" aria-hidden="true" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 flex-1" />
              {plan.planKey ? (
                showCheckout ? <RazorpayCheckoutButton plan={plan.planKey} /> : <PrimaryLink href="/contact">Contact Us</PrimaryLink>
              ) : (
                <PrimaryLink href={plan.href}>Run Free Audit</PrimaryLink>
              )}
            </ClayCard>
          );
        })}
      </section>
    </main>
  );
}
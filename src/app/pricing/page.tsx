import { ClayCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";

const plans = [
  {
    name: "Free Audit",
    bestFor: "First visibility check",
    cta: "Run Free Audit",
    href: "/#audit",
    tone: "green" as const,
    highlighted: false,
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
    name: "Full Report",
    bestFor: "Brands that want complete fixes",
    cta: "Unlock Full Report",
    href: "/#audit",
    tone: "violet" as const,
    highlighted: true,
    includes: [
      "All findings",
      "Competitor comparison",
      "AI Visibility Advisor",
      "Ready-to-paste fixes",
      "Developer action notes",
      "Full PDF report",
      "Full CSV export",
      "Full shareable report",
    ],
  },
  {
    name: "Agency/Team",
    bestFor: "Agencies and teams running audits for multiple clients",
    cta: "Contact Us",
    href: "/contact",
    tone: "amber" as const,
    highlighted: false,
    includes: [
      "Multiple website audits",
      "Client-ready reports",
      "Team sharing",
      "Priority roadmap access",
      "Custom support placeholder",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Pricing"
        title="Simple plans for AI visibility audits"
        description="No payment is connected yet. These cards clarify the planned free and full-report split for launch readiness."
      />
      <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <ClayCard key={plan.name} className={`flex flex-col p-5 ${plan.highlighted ? "border-violet-200 bg-violet-50/70 shadow-[0_24px_70px_rgba(91,33,182,0.14)]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold leading-7 text-slate-950">{plan.name}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Best for: {plan.bestFor}</p>
              </div>
              <StatusPill tone={plan.tone}>{plan.highlighted ? "Recommended" : "Preview"}</StatusPill>
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
            <PrimaryLink href={plan.href}>{plan.cta}</PrimaryLink>
          </ClayCard>
        ))}
      </section>
    </main>
  );
}
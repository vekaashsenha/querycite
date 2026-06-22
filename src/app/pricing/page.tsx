import Link from "next/link";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { AppCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";

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
      "Locked competitor and Advisor preview",
    ],
  },
  {
    name: "Launch Trial",
    price: "$10 first month, then $29/month",
    bestFor: "Brands validating the complete fix plan",
    tone: "violet" as const,
    highlighted: true,
    planKey: "starter" as const,
    includes: [
      "All findings",
      "Competitor comparison",
      "AI Visibility Advisor",
      "Ready-to-paste fixes",
      "Developer action notes",
      "Full PDF/CSV exports",
      "Full shareable report",
    ],
  },
  {
    name: "Agency",
    price: "From $149/month",
    bestFor: "Agencies and teams running client audits",
    tone: "amber" as const,
    highlighted: false,
    planKey: "agency" as const,
    includes: [
      "Multiple website audits",
      "Client-ready reports",
      "Team sharing foundation",
      "Priority roadmap access",
      "White-label report option",
      "Custom support",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Pricing"
        title="Start with a free audit. Unlock the full fix plan when you are ready."
        description="QueryCite shows AI visibility gaps for free, then unlocks the complete AEO/GEO action plan, AI Advisor, competitor comparison, and export-ready reports in paid plans."
      />
      <section className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <AppCard key={plan.name} className={`flex flex-col p-6 ${plan.highlighted ? "border-violet-300 bg-violet-50 shadow-[0_24px_70px_rgba(91,33,182,0.14)]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold leading-7 text-slate-950">{plan.name}</h2>
                <p className="mt-3 text-3xl font-semibold leading-9 text-slate-950">{plan.price}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">Best for: {plan.bestFor}</p>
              </div>
              <StatusPill tone={plan.tone}>{plan.planKey ? "Private test" : "Free"}</StatusPill>
            </div>

            <div className="mt-6 border-t border-slate-200 pt-5">
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
            {plan.planKey ? <RazorpayCheckoutButton plan={plan.planKey} mode="order" /> : <PrimaryLink href={plan.href}>Run Free Audit</PrimaryLink>}
          </AppCard>
        ))}
      </section>
      <section className="mx-auto mt-8 max-w-6xl rounded-3xl border border-slate-200 bg-white p-5 text-sm font-semibold leading-6 text-slate-600 shadow-sm">
        Subscription billing is being tested separately. Test payments validate checkout and receipt flow. Paid/full access remains protected by verified access logic.
      </section>
      <section className="mx-auto mt-10 grid max-w-6xl gap-5 md:grid-cols-3">
        {["No guaranteed AI citations", "No guaranteed rankings", "No guaranteed traffic or revenue"].map((item) => (
          <AppCard key={item} className="p-5"><p className="text-sm font-semibold text-slate-800">{item}</p></AppCard>
        ))}
      </section>
      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap justify-center gap-3">
        <PrimaryLink href="/#audit">Run Free AI Visibility Audit</PrimaryLink>
        <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900">Contact QueryCite</Link>
      </div>
    </main>
  );
}
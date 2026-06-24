import Link from "next/link";
import { IimaBetaOffer } from "@/components/IimaBetaOffer";
import { RazorpayCheckoutButton } from "@/components/RazorpayCheckoutButton";
import { AppCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth/server";

const plans = [
  {
    name: "Free Audit",
    price: "$0",
    subtext: "Free visibility check",
    bestFor: "First audit",
    badge: "Free",
    tone: "green" as const,
    highlighted: false,
    planKey: null,
    href: "/#audit",
    cta: "Run Free Audit",
    includes: ["AI Visibility Score", "AEO/GEO scores", "Top 3 findings", "Free PDF and basic CSV"],
  },
  {
    name: "Launch / Starter",
    price: "$29/month",
    subtext: "India beta: ₹1,499/month",
    bestFor: "Complete fix plan",
    badge: "Beta",
    tone: "violet" as const,
    highlighted: true,
    planKey: "starter" as const,
    href: null,
    cta: "Start Beta",
    includes: ["All findings", "AI Advisor", "Competitor comparison", "Full PDF/CSV and fix packs"],
  },
  {
    name: "Agency",
    price: "From $149/month",
    subtext: "India beta: from ₹9,999/month",
    bestFor: "Teams and clients",
    badge: "Best for teams",
    tone: "amber" as const,
    highlighted: false,
    planKey: null,
    href: "/contact",
    cta: "Contact Agency Beta",
    includes: ["Multiple audits", "Client-ready reports", "Team workflow foundation", "Priority support"],
  },
];

const comparisonRows = [
  ["AI visibility score", "Included", "Included", "Included"],
  ["Full recommendations", "Top 3", "Included", "Included"],
  ["AI Advisor", "Preview", "Included", "Included"],
  ["Competitor comparison", "Preview", "Included", "Expanded"],
  ["Exports", "Free PDF / basic CSV", "Full PDF / CSV", "Client-ready"],
];

export default async function PricingPage() {
  const user = await getCurrentUser();

  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Pricing"
        title="Start free. Unlock the complete fix plan when it is useful."
        description="Clear report access, AI Advisor guidance, and server-verified Razorpay checkout in INR."
      />

      <section className="mx-auto mt-10 grid max-w-6xl gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <AppCard key={plan.name} className={`flex flex-col p-6 ${plan.highlighted ? "border-violet-300 bg-violet-50 shadow-[0_24px_70px_rgba(91,33,182,0.14)]" : ""}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-slate-950">{plan.name}</h2>
                <p className="mt-3 text-3xl font-semibold text-slate-950">{plan.price}</p>
                <p className="mt-1 text-sm font-semibold text-slate-600">{plan.subtext}</p>
              </div>
              <StatusPill tone={plan.tone}>{plan.badge}</StatusPill>
            </div>
            <p className="mt-5 rounded-2xl bg-white/80 p-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600">Best for: {plan.bestFor}</p>
            <div className="mt-5 grid gap-2">
              {plan.includes.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-sm font-semibold text-slate-700">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-950 text-[10px] text-white" aria-hidden="true">✓</span>
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6 flex-1" />
            {plan.planKey ? (
              <RazorpayCheckoutButton plan={plan.planKey} mode="order" name={user?.name ?? undefined} email={user?.email} buttonLabel={plan.cta} helperText="Razorpay checkout charges in INR." />
            ) : plan.href === "/#audit" ? (
              <PrimaryLink href={plan.href}>{plan.cta}</PrimaryLink>
            ) : (
              <Link href={plan.href || "/contact"} className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white">
                {plan.cta}
              </Link>
            )}
          </AppCard>
        ))}
      </section>

      <section className="mx-auto mt-8 max-w-6xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 p-5">
          <h2 className="text-2xl font-semibold text-slate-950">Plan comparison</h2>
          <p className="mt-1 text-sm text-slate-600">The essentials at a glance.</p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-[1.35fr_repeat(3,1fr)] bg-slate-950 px-5 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white">
              <span>Feature</span><span>Free</span><span>Beta</span><span>Agency</span>
            </div>
            {comparisonRows.map(([feature, free, beta, agency]) => (
              <div key={feature} className="grid grid-cols-[1.35fr_repeat(3,1fr)] border-t border-slate-100 px-5 py-4 text-sm text-slate-700">
                <span className="font-semibold text-slate-950">{feature}</span><span>{free}</span><span>{beta}</span><span>{agency}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <IimaBetaOffer name={user?.name ?? undefined} email={user?.email} />

      <section className="mx-auto mt-8 grid max-w-6xl gap-4 md:grid-cols-3">
        {[
          ["Webhook-confirmed access", "Paid access begins after Razorpay confirms capture."],
          ["Digital delivery", "Reports and access are delivered online, usually within minutes."],
          ["Beta feedback", "We are collecting feedback on clarity, UI/UX, and paid access flow."],
        ].map(([title, copy]) => (
          <AppCard key={title} className="p-5">
            <h2 className="font-semibold text-slate-950">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{copy}</p>
          </AppCard>
        ))}
      </section>

      <div className="mx-auto mt-10 flex max-w-6xl flex-wrap justify-center gap-3">
        <PrimaryLink href="/#audit">Run Free AI Visibility Audit</PrimaryLink>
        <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900">Contact QueryCite</Link>
      </div>
    </main>
  );
}

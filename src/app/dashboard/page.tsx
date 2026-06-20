import Link from "next/link";
import { ClayCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";

const dashboardCards = [
  ["Profile status", "Work-email login and company profile storage will be enabled for private beta users."],
  ["Primary website", "Your saved company domain will appear here after beta login is connected."],
  ["Recent reports", "Saved AI Visibility Audit history will appear here after report storage is enabled."],
  ["Advisor credits", "Private beta default is 50 Advisor messages/month once account tracking is active."],
  ["Competitors", "Up to 3 competitors per company/domain, with 3 changes per billing cycle."],
  ["Feedback access", "Private beta feedback can be sent from the contact page now."],
];

export default function DashboardPage() {
  return (
    <main className="px-5 py-14 sm:px-8">
      <PageIntro
        eyebrow="Private beta dashboard"
        title="QueryCite dashboard foundation"
        description="Dashboard access will be enabled for private beta users. Contact QueryCite for early access."
      />
      <section className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-2 lg:grid-cols-3">
        {dashboardCards.map(([title, description]) => (
          <ClayCard key={title}>
            <StatusPill tone="amber">Beta foundation</StatusPill>
            <h2 className="mt-4 text-xl font-semibold text-slate-950">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          </ClayCard>
        ))}
      </section>
      <div className="mt-10 flex justify-center gap-3">
        <PrimaryLink href="/contact">Contact QueryCite</PrimaryLink>
        <Link href="/#audit" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:border-slate-950">
          Run Free Audit
        </Link>
      </div>
    </main>
  );
}
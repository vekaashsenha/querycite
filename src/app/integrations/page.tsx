import { ClayCard, SectionHeader, StatusPill } from "@/components/ui";
import { integrations } from "@/lib/mock";

const groups = [
  ["Live Now", integrations.liveNow, "green"],
  ["Beta Testing", integrations.betaTesting, "amber"],
  ["Coming Soon", integrations.comingSoon, "violet"],
] as const;

export default function IntegrationsPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <SectionHeader eyebrow="Integrations" title="Integration status" description="Integration availability is clearly labeled by status so teams can separate available workflows from upcoming roadmap items." />
      <section className="mx-auto mt-10 grid max-w-7xl gap-6 md:grid-cols-3">
        {groups.map(([title, items, tone]) => (
          <ClayCard key={title}>
            <StatusPill tone={tone}>{title}</StatusPill>
            <h2 className="mt-5 text-2xl font-semibold text-slate-950">{title}</h2>
            <div className="mt-6 grid gap-3">
              {items.map((item) => <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-700">{item}</div>)}
            </div>
          </ClayCard>
        ))}
      </section>
    </main>
  );
}

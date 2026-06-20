import { LockedPanel, ScoreRing, SectionHeader, StatusPill } from "@/components/ui";
import { mockReport } from "@/lib/mock";

export default function ReportPage() {
  return (
    <main className="px-5 py-14 sm:px-8">
      <section className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <StatusPill tone="green">Free report preview</StatusPill>
            <h1 className="mt-4 text-4xl font-semibold text-slate-950 sm:text-5xl">AI Visibility Audit Report</h1>
            <p className="mt-3 text-base text-slate-600">Website URL: {mockReport.websiteUrl}</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/80 p-4 text-sm text-slate-600 shadow-sm">Mock data only. No live audit connected.</div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ScoreRing label="AI Visibility Score" score={mockReport.scores.aiVisibility} tone="bg-violet-600" />
          <ScoreRing label="AEO Score" score={mockReport.scores.aeo} tone="bg-fuchsia-500" />
          <ScoreRing label="GEO Score" score={mockReport.scores.geo} tone="bg-emerald-500" />
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Top 3 findings</h2>
            <StatusPill tone="green">Free</StatusPill>
          </div>
          <div className="mt-5 grid gap-3">
            {mockReport.topFindings.map((finding, index) => (
              <div key={finding} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="mr-2 font-semibold text-slate-950">{index + 1}.</span>{finding}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg">
          <h2 className="text-2xl font-semibold text-slate-950">Free report sections</h2>
          <div className="mt-5 grid gap-3">
            {mockReport.limitedSections.map((section) => (
              <div key={section} className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
                <span>{section}</span><span>Available</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
        <SectionHeader eyebrow="Paid sections" title="Visible but locked in Phase 1" description="These sections show the planned full report value without connecting payment or authentication." />
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mockReport.lockedSections.map((section) => (
            <LockedPanel key={section} title={section} description="Unlock in the paid full report placeholder." />
          ))}
        </div>
      </section>
    </main>
  );
}
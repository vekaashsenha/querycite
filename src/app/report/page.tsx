import Link from "next/link";
import { LockedPanel, ScoreRing, SectionHeader, StatusPill } from "@/components/ui";
import { fullReportPreview, mockReport } from "@/lib/mock";

type ReportPageProps = {
  searchParams?: Promise<{ demo?: string | string[] }>;
};

function CardShell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg ${className}`}>{children}</div>;
}

function AvailableRow({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
      <span>{label}</span>
      <span>Available</span>
    </div>
  );
}

function FullReportSections() {
  return (
    <div className="mt-8 grid gap-6">
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <CardShell>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-slate-950">All findings</h3>
            <StatusPill tone="green">Unlocked</StatusPill>
          </div>
          <div className="mt-5 grid gap-3">
            {fullReportPreview.allFindings.map((finding, index) => (
              <div key={finding} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="mr-2 font-semibold text-slate-950">{index + 1}.</span>{finding}
              </div>
            ))}
          </div>
        </CardShell>

        <CardShell>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-2xl font-semibold text-slate-950">AI Visibility Advisor</h3>
            <StatusPill tone="green">Unlocked</StatusPill>
          </div>
          <div className="mt-5 grid gap-3">
            {fullReportPreview.advisor.map((item) => (
              <div key={item} className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm leading-6 text-slate-700">{item}</div>
            ))}
          </div>
        </CardShell>
      </div>

      <CardShell>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-semibold text-slate-950">Competitor AI Visibility Comparison</h3>
          <StatusPill tone="green">Unlocked</StatusPill>
        </div>
        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-[1fr_0.8fr_0.7fr_1.6fr] bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white">
            <span>Website</span>
            <span>Score</span>
            <span>Gap</span>
            <span>Why they may be recommended</span>
          </div>
          {fullReportPreview.competitors.map((competitor) => (
            <div key={competitor.name} className="grid grid-cols-[1fr_0.8fr_0.7fr_1.6fr] border-t border-slate-100 bg-white px-4 py-4 text-sm leading-6 text-slate-700">
              <span className="font-semibold text-slate-950">{competitor.name}</span>
              <span>{competitor.aiVisibility}/100</span>
              <span className="font-semibold text-rose-600">{competitor.gap}</span>
              <span>{competitor.reason}</span>
            </div>
          ))}
        </div>
      </CardShell>

      <div className="grid gap-6 lg:grid-cols-3">
        <CardShell>
          <h3 className="text-xl font-semibold text-slate-950">Ready-to-paste fixes</h3>
          <div className="mt-5 grid gap-3">
            {fullReportPreview.fixes.map((fix) => (
              <div key={fix.title} className="rounded-2xl border border-teal-100 bg-teal-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{fix.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">{fix.copy}</p>
              </div>
            ))}
          </div>
        </CardShell>

        <CardShell>
          <h3 className="text-xl font-semibold text-slate-950">Developer action notes</h3>
          <div className="mt-5 grid gap-3">
            {fullReportPreview.developerNotes.map((note) => (
              <div key={note} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-slate-700">{note}</div>
            ))}
          </div>
        </CardShell>

        <CardShell>
          <h3 className="text-xl font-semibold text-slate-950">Full report exports</h3>
          <div className="mt-5 grid gap-3">
            {fullReportPreview.exportOptions.map((option) => (
              <AvailableRow key={option} label={option} />
            ))}
          </div>
        </CardShell>
      </div>
    </div>
  );
}

export default async function ReportPage({ searchParams }: ReportPageProps) {
  const params = searchParams ? await searchParams : {};
  const demoParam = params.demo;
  const isFullDemo = Array.isArray(demoParam) ? demoParam.includes("full") : demoParam === "full";

  return (
    <main className="px-5 py-14 sm:px-8">
      <section className="mx-auto max-w-7xl">
        {isFullDemo ? (
          <div className="mb-6 rounded-3xl border border-violet-200 bg-violet-50 px-5 py-4 text-sm font-semibold leading-6 text-violet-800 shadow-sm">
            Beta preview mode: Full report sections are temporarily unlocked for feedback.
          </div>
        ) : null}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <StatusPill tone={isFullDemo ? "violet" : "green"}>{isFullDemo ? "Full report preview" : "Free report"}</StatusPill>
            <h1 className="mt-4 text-4xl font-semibold text-slate-950 sm:text-5xl">AI Visibility Audit Report</h1>
            <p className="mt-3 text-base text-slate-600">Website URL: {mockReport.websiteUrl}</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-sm">
            QueryCite highlights citation readiness, answer coverage, entity clarity, and AEO/GEO gaps.
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <ScoreRing label="AI Visibility Score" score={mockReport.scores.aiVisibility} tone="bg-violet-600" />
          <ScoreRing label="AEO Score" score={mockReport.scores.aeo} tone="bg-fuchsia-500" />
          <ScoreRing label="GEO Score" score={mockReport.scores.geo} tone="bg-emerald-500" />
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <CardShell>
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
        </CardShell>

        <CardShell>
          <h2 className="text-2xl font-semibold text-slate-950">Free report sections</h2>
          <div className="mt-5 grid gap-3">
            {mockReport.limitedSections.map((section) => (
              <AvailableRow key={section} label={section} />
            ))}
          </div>
        </CardShell>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
        <SectionHeader
          eyebrow="FULL REPORT PREVIEW"
          title="Unlock the complete AI Visibility Report"
          description="See the full set of findings, competitor comparison, AI Visibility Advisor, ready-to-paste fixes, developer notes, and export options in the complete report."
        />

        {isFullDemo ? (
          <FullReportSections />
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {mockReport.lockedSections.map((section) => (
                <LockedPanel key={section} title={section} description="Available in the full report" />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/report?demo=full" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800">
                Unlock Full Report
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

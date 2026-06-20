import Link from "next/link";
import type { ReactNode } from "react";
import { LockedPanel, ScoreRing, SectionHeader, StatusPill } from "@/components/ui";
import { fullReportPreview, mockReport } from "@/lib/mock";

type ReportPageProps = {
  searchParams?: Promise<{ demo?: string | string[] }>;
};

const suggestedAdvisorQuestions = [
  "What should we fix first?",
  "Why might competitors be easier to cite?",
  "Which FAQs should we add?",
  "What should developers change?",
];

const reportActions = [
  ["PDF export", "Full branded PDF report packaging for stakeholder review."],
  ["CSV export", "Structured report data for internal tracking and agency workflows."],
  ["Share link", "A shareable report URL for founders, marketers, and clients."],
  ["Email delivery", "Send the report summary and next steps to stakeholders."],
];

function CardShell({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-3xl border border-white/70 bg-white/85 p-6 shadow-lg ${className}`}>{children}</div>;
}

function StatusRow({ label, status = "Available", tone = "green" }: { label: string; status?: string; tone?: "green" | "amber" | "slate" }) {
  const styles = {
    green: "bg-emerald-50 text-emerald-800",
    amber: "bg-amber-50 text-amber-800",
    slate: "bg-slate-50 text-slate-700",
  };

  return (
    <div className={`flex items-center justify-between gap-3 rounded-2xl p-4 text-sm font-semibold ${styles[tone]}`}>
      <span>{label}</span>
      <span>{status}</span>
    </div>
  );
}

function FreeReportRow({ label }: { label: string }) {
  if (label.toLowerCase().includes("share")) {
    return <StatusRow label={label} status="Locked" tone="slate" />;
  }

  if (label.toLowerCase().includes("pdf") || label.toLowerCase().includes("csv") || label.toLowerCase().includes("email")) {
    return <StatusRow label={label} status="Preview" tone="amber" />;
  }

  return <StatusRow label={label} />;
}

function BetaBanner() {
  return (
    <div className="mb-8 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-teal-50 p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Beta Preview Mode</p>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-800">
            Full report sections are temporarily unlocked for private feedback. Scores, recommendations, and workflows are being validated before paid launch.
          </p>
        </div>
        <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800">
          Share Feedback
        </Link>
      </div>
    </div>
  );
}

function AdvisorBetaPreview() {
  return (
    <CardShell className="border-violet-200 bg-violet-50/70">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-2xl font-semibold text-slate-950">AI Visibility Advisor</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Beta full report preview with report-based sample responses only.</p>
        </div>
        <StatusPill tone="violet">Private feedback access</StatusPill>
      </div>

      <div className="mt-5 rounded-2xl border border-violet-100 bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-slate-950">Suggested questions</p>
          <p className="text-xs font-semibold text-violet-700">Preview credits: 12 / 20</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestedAdvisorQuestions.map((question) => (
            <span key={question} className="rounded-full border border-violet-100 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">
              {question}
            </span>
          ))}
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Sample response</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">
          Start by strengthening the hero answer block, then add buyer FAQs and supported schema. These changes improve entity clarity, answer readiness, and the page signals competitors currently appear stronger on.
        </p>
      </div>

      <div className="mt-4 grid gap-2">
        <label htmlFor="advisor-input" className="text-sm font-semibold text-slate-700">Ask about this report</label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            id="advisor-input"
            type="text"
            disabled
            placeholder="Ask about AEO/GEO fixes, competitor gaps, or next steps"
            className="min-h-12 flex-1 rounded-2xl border border-slate-200 bg-white px-4 text-sm text-slate-500 outline-none"
          />
          <button type="button" disabled className="min-h-12 rounded-2xl border border-slate-200 bg-slate-100 px-5 text-sm font-semibold text-slate-500">
            Preview only
          </button>
        </div>
      </div>

      <p className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-600">
        AI Advisor can only help with this report, AEO/GEO fixes, competitor gaps, content improvements, developer notes, and next steps.
      </p>
    </CardShell>
  );
}

function ReportActionPreview() {
  return (
    <CardShell>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">Report actions</h3>
        <StatusPill tone="amber">Coming soon</StatusPill>
      </div>
      <div className="mt-5 grid gap-3">
        {reportActions.map(([label, description]) => (
          <div key={label} className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-950">{label}</p>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800">Preview</span>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{description}</p>
          </div>
        ))}
      </div>
    </CardShell>
  );
}

function FullReportSections() {
  return (
    <div className="mt-8 grid gap-6">
      <div className="rounded-3xl border border-teal-100 bg-teal-50 p-5 text-sm font-semibold leading-6 text-teal-900">
        This preview is designed to collect feedback on report usefulness, actionability, pricing, and workflow before paid launch.
      </div>

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

        <AdvisorBetaPreview />
      </div>

      <CardShell>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-2xl font-semibold text-slate-950">Competitor AI Visibility Comparison</h3>
          <StatusPill tone="green">Unlocked</StatusPill>
        </div>
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
          <div className="min-w-[760px]">
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

        <ReportActionPreview />
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
        {isFullDemo ? <BetaBanner /> : null}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <StatusPill tone={isFullDemo ? "violet" : "green"}>{isFullDemo ? "Beta full report preview" : "Free report"}</StatusPill>
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
              <FreeReportRow key={section} label={section} />
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
              <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800">
                Unlock Full Report
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}

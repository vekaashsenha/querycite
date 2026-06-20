"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { AdvisorChat } from "@/components/AdvisorChat";
import { ClayCard, LockedPanel, ScoreRing, SectionHeader, StatusPill } from "@/components/ui";
import { auditStorageKey, isWebsiteAuditReport, type AuditFinding, type WebsiteAuditReport } from "@/lib/audit-report";

type ReportExperienceProps = {
  isFullDemo: boolean;
};

function findingToCsvRow(finding: AuditFinding) {
  return [finding.priority, finding.owner, finding.issue, finding.whyItMatters, finding.recommendedFix]
    .map((value) => `"${value.replace(/"/g, '""')}"`)
    .join(",");
}

function downloadFindingsCsv(report: WebsiteAuditReport) {
  const header = ["Priority", "Owner", "Issue", "Why it matters", "Recommended fix"].join(",");
  const rows = report.findings.map(findingToCsvRow).join("\n");
  const csv = `${header}\n${rows}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const hostname = new URL(report.finalUrl).hostname.replace(/[^a-z0-9.-]/gi, "-");
  link.href = url;
  link.download = `querycite-${hostname}-findings.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function scoreCards(report: WebsiteAuditReport) {
  return [
    ["AI Visibility Score", report.scores.aiVisibility, "bg-violet-600"],
    ["AEO Readiness Score", report.scores.aeoReadiness, "bg-fuchsia-500"],
    ["GEO Readiness Score", report.scores.geoReadiness, "bg-emerald-500"],
    ["Citation Readiness Score", report.scores.citationReadiness, "bg-teal-500"],
    ["Content Readiness Score", report.scores.contentReadiness, "bg-amber-400"],
    ["Technical Readiness Score", report.scores.technicalReadiness, "bg-slate-700"],
  ] as const;
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

function FindingCard({ finding, index }: { finding: AuditFinding; index: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-950">{index + 1}.</span>
        <StatusPill tone={finding.priority === "High" ? "amber" : "slate"}>{finding.priority}</StatusPill>
        <StatusPill tone="slate">{finding.owner}</StatusPill>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">{finding.issue}</h3>
      <p className="mt-2">{finding.whyItMatters}</p>
      <p className="mt-2 font-semibold text-slate-900">Fix: {finding.recommendedFix}</p>
    </div>
  );
}

function ReportActions({ report }: { report: WebsiteAuditReport }) {
  return (
    <ClayCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">Report actions</h3>
        <StatusPill tone="green">CSV works</StatusPill>
      </div>
      <div className="mt-5 grid gap-3">
        <button type="button" onClick={() => downloadFindingsCsv(report)} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100">
          Download CSV findings
        </button>
        {[
          ["PDF export preview", "Coming soon for beta users"],
          ["Share report preview", "Coming soon for beta users"],
          ["Email report preview", "Coming soon for beta users"],
        ].map(([label, status]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            <span>{label}</span>
            <span>{status}</span>
          </div>
        ))}
      </div>
    </ClayCard>
  );
}

function SignalChecks({ report }: { report: WebsiteAuditReport }) {
  return (
    <ClayCard>
      <h3 className="text-xl font-semibold text-slate-950">Website signals checked</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Object.entries(report.checks).map(([key, check]) => (
          <div key={key} className={`rounded-2xl border p-4 text-sm leading-6 ${check.passed ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-amber-100 bg-amber-50 text-amber-900"}`}>
            <p className="font-semibold">{check.label}</p>
            <p className="mt-1">{check.detail}</p>
          </div>
        ))}
      </div>
    </ClayCard>
  );
}

function NoReportState() {
  return (
    <main className="px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-lg">
        <StatusPill tone="amber">No report loaded</StatusPill>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950">Run a website-based audit first</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">Enter a website URL on the homepage to generate a real AI visibility readiness report. The latest report will open here.</p>
        <div className="mt-7">
          <Link href="/#audit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white">Run Free Audit</Link>
        </div>
      </div>
    </main>
  );
}

function subscribeToReportStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredReportSnapshot() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(auditStorageKey) ?? "";
}

function getServerReportSnapshot() {
  return "";
}

function parseStoredReport(storedReport: string) {
  if (!storedReport) return null;

  try {
    const parsed: unknown = JSON.parse(storedReport);
    return isWebsiteAuditReport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function ReportExperience({ isFullDemo }: ReportExperienceProps) {
  const storedReport = useSyncExternalStore(subscribeToReportStorage, getStoredReportSnapshot, getServerReportSnapshot);
  const report = useMemo(() => parseStoredReport(storedReport), [storedReport]);
  const topFindings = useMemo(() => report?.findings.slice(0, 3) ?? [], [report]);
  const topFixes = useMemo(() => report?.fixes.slice(0, 3) ?? [], [report]);

  if (!report) {
    return <NoReportState />;
  }

  return (
    <main className="px-5 py-14 sm:px-8">
      <section className="mx-auto max-w-7xl">
        {isFullDemo ? <BetaBanner /> : null}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <StatusPill tone={isFullDemo ? "violet" : "green"}>{isFullDemo ? "Beta full report preview" : "Free report"}</StatusPill>
            <h1 className="mt-4 text-4xl font-semibold text-slate-950 sm:text-5xl">AI Visibility Audit Report</h1>
            <p className="mt-3 text-base text-slate-600">Website URL: {report.finalUrl}</p>
            <p className="mt-1 text-sm text-slate-500">Scanned: {new Date(report.scannedAt).toLocaleString()}</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-sm">
            Website-based AI visibility readiness audit using real homepage, content, technical, and trust signals.
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {scoreCards(report).map(([label, value, tone]) => <ScoreRing key={label} label={label} score={value} tone={tone} />)}
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <ClayCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Top 3 findings</h2>
            <StatusPill tone="green">Free</StatusPill>
          </div>
          <div className="mt-5 grid gap-3">
            {topFindings.map((finding, index) => <FindingCard key={finding.issue} finding={finding} index={index} />)}
          </div>
        </ClayCard>

        <ClayCard>
          <h2 className="text-2xl font-semibold text-slate-950">Top 3 fixes</h2>
          <div className="mt-5 grid gap-3">
            {topFixes.map((finding, index) => <FindingCard key={finding.recommendedFix} finding={finding} index={index} />)}
          </div>
          <div className="mt-5">
            <button type="button" onClick={() => downloadFindingsCsv(report)} className="inline-flex min-h-11 items-center justify-center rounded-full bg-emerald-700 px-5 text-sm font-semibold text-white transition hover:bg-emerald-800">
              Download CSV findings
            </button>
          </div>
        </ClayCard>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
        <SectionHeader
          eyebrow="FULL REPORT PREVIEW"
          title="Unlock the complete AI Visibility Report"
          description="See all findings, AI Visibility Advisor, technical notes, structured data guidance, and export-ready report workflows in the complete report."
        />

        {isFullDemo ? (
          <div className="mt-8 grid gap-6">
            <div className="rounded-3xl border border-teal-100 bg-teal-50 p-5 text-sm font-semibold leading-6 text-teal-900">
              This preview is designed to collect feedback on report usefulness, actionability, pricing, and workflow before paid launch.
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <ClayCard>
                <h3 className="text-2xl font-semibold text-slate-950">All findings</h3>
                <div className="mt-5 grid gap-3">{report.findings.map((finding, index) => <FindingCard key={finding.issue} finding={finding} index={index} />)}</div>
              </ClayCard>
              <AdvisorChat currentReportData={report} planType="betaFullReport" />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
              <SignalChecks report={report} />
              <div className="grid gap-6">
                <ClayCard>
                  <h3 className="text-xl font-semibold text-slate-950">Developer notes</h3>
                  <div className="mt-5 grid gap-3">
                    {report.developerNotes.map((note) => <div key={note} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-slate-700">{note}</div>)}
                  </div>
                </ClayCard>
                <ReportActions report={report} />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["All findings", "AI Visibility Advisor", "Developer action notes", "Structured data details", "Full CSV", "PDF/share/email previews"].map((section) => (
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

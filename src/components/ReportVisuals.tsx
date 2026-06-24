import type { AuditFinding, WebsiteAuditReport } from "@/lib/audit-report";
import { AppCard, StatusPill } from "@/components/ui";

function estimatedEffort(finding: AuditFinding) {
  const text = `${finding.issue} ${finding.recommendedFix}`.toLowerCase();
  const higherEffortSignals = ["template", "architecture", "migration", "redesign", "javascript", "rendering", "multiple pages", "sitewide"];
  return higherEffortSignals.some((signal) => text.includes(signal)) ? "High" : "Low";
}

function MatrixColumn({ title, tone, findings }: { title: string; tone: "rose" | "violet" | "slate"; findings: AuditFinding[] }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <StatusPill tone={tone}>{title}</StatusPill>
      <div className="mt-4 grid gap-2">
        {findings.length ? findings.slice(0, 4).map((finding) => (
          <div key={`${title}-${finding.issue}`} className="rounded-xl border border-white bg-white p-3">
            <p className="text-sm font-semibold leading-5 text-slate-950">{finding.issue}</p>
            <p className="mt-1 text-xs font-semibold text-slate-500">{finding.owner} · Estimated effort: {estimatedEffort(finding)}</p>
          </div>
        )) : <p className="text-sm text-slate-500">No findings in this group.</p>}
      </div>
    </div>
  );
}

export function PriorityMatrix({ findings }: { findings: AuditFinding[] }) {
  const highPriority = findings.filter((finding) => finding.priority === "High");
  const highLowEffort = highPriority.filter((finding) => estimatedEffort(finding) === "Low");
  const highHighEffort = highPriority.filter((finding) => estimatedEffort(finding) === "High");
  const later = findings.filter((finding) => finding.priority !== "High");

  return (
    <AppCard className="p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Priority matrix</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Impact first, effort second</h2>
        <p className="mt-2 text-sm text-slate-600">Effort is estimated from the report recommendation; confirm it with the implementation owner.</p>
      </div>
      <div className="mt-5 grid gap-4 lg:grid-cols-3">
        <MatrixColumn title="High impact / low effort" tone="rose" findings={highLowEffort} />
        <MatrixColumn title="High impact / high effort" tone="violet" findings={highHighEffort} />
        <MatrixColumn title="Low impact / later" tone="slate" findings={later} />
      </div>
    </AppCard>
  );
}

function ReadinessBar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-slate-700">{label}</p>
        <p className="text-lg font-semibold text-slate-950">{value}/100</p>
      </div>
      <div className="mt-3 h-2.5 rounded-full bg-white" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}>
        <div className={`h-2.5 rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  );
}

export function ReadinessSnapshot({ report, schemaReadiness }: { report: WebsiteAuditReport; schemaReadiness: number }) {
  return (
    <AppCard className="mt-6 p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Readiness snapshot</p>
          <h2 className="mt-2 text-2xl font-semibold text-slate-950">Four signals to watch</h2>
        </div>
        <p className="text-xs font-semibold text-slate-500">Based on this audit</p>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <ReadinessBar label="AI Visibility Score" value={report.scores.aiVisibility} tone="bg-violet-600" />
        <ReadinessBar label="AI Crawler Readiness" value={report.scores.aiCrawlerReadiness} tone="bg-cyan-500" />
        <ReadinessBar label="Content Clarity" value={report.scores.contentReadiness} tone="bg-amber-400" />
        <ReadinessBar label="Schema Readiness" value={schemaReadiness} tone="bg-emerald-500" />
      </div>
    </AppCard>
  );
}

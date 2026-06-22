import Link from "next/link";
import { DashboardShell, WorkspaceHeader } from "@/components/DashboardShell";
import { AppCard, EmptyState, PrimaryLink, StatusPill } from "@/components/ui";
import { getReportsForAuthenticatedUser } from "@/lib/paid-foundation";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function ReportsPage() {
  const user = await requireAuthenticatedUser("/reports");
  await syncAuthenticatedUser(user);
  const reports = await getReportsForAuthenticatedUser(user);

  return (
    <DashboardShell
      user={{ email: user.email, name: user.name }}
      title="Reports"
      description="Saved QueryCite reports linked to this authenticated account."
      badge={<StatusPill tone={reports.length ? "green" : "amber"}>{reports.length ? `${reports.length} saved` : "No reports yet"}</StatusPill>}
    >
      <AppCard className="p-6">
        <WorkspaceHeader eyebrow="Report history" title="Saved QueryCite reports" description="Free report links remain viewable without login, but saved account history requires authentication." action={<PrimaryLink href="/#audit">Run Free Audit</PrimaryLink>} />
        {reports.length ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white md:grid md:grid-cols-[1.5fr_0.75fr_0.55fr_0.55fr_0.55fr_0.6fr]">
              <span>Website URL</span><span>Scan date</span><span>AI</span><span>AEO</span><span>GEO</span><span>Report</span>
            </div>
            {reports.map((report) => (
              <div key={report.id} className="grid gap-3 border-t border-slate-100 bg-white px-4 py-4 text-sm leading-6 text-slate-700 md:grid-cols-[1.5fr_0.75fr_0.55fr_0.55fr_0.55fr_0.6fr]">
                <span className="break-all font-semibold text-slate-950">{report.finalUrl || report.websiteUrl}</span>
                <span>{formatDate(report.createdAt)}</span>
                <span>{report.aiVisibilityScore}</span>
                <span>{report.aeoScore}</span>
                <span>{report.geoScore}</span>
                <Link href={`/report?reportId=${report.id}`} className="font-semibold text-violet-700">Open</Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6"><EmptyState title="No reports yet. Run your first audit." description="Run a free audit or open a report link sent to this email, then return here after login." action={<PrimaryLink href="/#audit">Run Free Audit</PrimaryLink>} /></div>
        )}
      </AppCard>
    </DashboardShell>
  );
}
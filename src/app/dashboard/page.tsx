import Link from "next/link";
import { AdvisorChat } from "@/components/AdvisorChat";
import { DashboardShell, WorkspaceHeader } from "@/components/DashboardShell";
import { AppCard, EmptyState, LockedPanel, MetricCard, PrimaryLink, StatusPill } from "@/components/ui";
import { getAdvisorResetDate, getPaidAccessContextForUser, getReportsForAuthenticatedUser } from "@/lib/paid-foundation";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser("/dashboard");
  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);
  const reports = await getReportsForAuthenticatedUser(user);
  const latestReport = reports[0] ?? null;
  const hasWorkspaceAccess = access.verifiedPaidAccess || access.qaAccess;
  const advisorReport = hasWorkspaceAccess ? latestReport?.fullReportData ?? null : null;
  const latestScore = latestReport?.aiVisibilityScore ? `${latestReport.aiVisibilityScore}/100` : "-";
  const advisorCredits = hasWorkspaceAccess ? `0/${access.limits.advisorCredits}` : "0/0";
  const competitorChanges = hasWorkspaceAccess ? `${access.limits.competitorChanges}/${access.limits.competitorChanges}` : "0/3";

  return (
    <DashboardShell
      user={{ email: user.email, name: user.name, isAdmin: access.isAdmin }}
      title="Overview"
      description="Your QueryCite workspace for saved reports, AI visibility signals, Advisor usage, competitor context, and billing status."
      badge={<StatusPill tone={access.qaAccess ? "cyan" : access.verifiedPaidAccess ? "green" : "slate"}>{access.qaAccess ? "Admin preview" : access.verifiedPaidAccess ? "Full access" : "Free account"}</StatusPill>}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Latest score" value={latestScore} detail={latestReport ? latestReport.finalUrl || latestReport.websiteUrl : "No reports yet"} tone="violet" />
        <MetricCard label="Reports generated" value={reports.length} detail="Reports linked to this account" tone="green" />
        <MetricCard label="Advisor credits used" value={advisorCredits} detail={hasWorkspaceAccess ? (access.qaAccess ? "Admin QA access active" : "Local usage resets by billing period") : "Unlock with full report access"} tone="cyan" />
        <MetricCard label="Competitor changes left" value={competitorChanges} detail="Limit applies per billing period" tone="amber" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.74fr]">
        <AppCard className="p-6">
          <WorkspaceHeader
            eyebrow="Latest report"
            title={latestReport ? latestReport.finalUrl || latestReport.websiteUrl : "No reports yet. Run your first audit."}
            description={latestReport ? `Scanned ${formatDate(latestReport.createdAt)}. Review scores, top findings, and free/full report access from here.` : "Run a free audit to generate your first AI visibility report and start building report history."}
            action={<PrimaryLink href="/#audit">Run New Audit</PrimaryLink>}
          />
          {latestReport ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-4">
              {[
                ["AI Visibility", latestReport.aiVisibilityScore],
                ["AEO", latestReport.aeoScore],
                ["GEO", latestReport.geoScore],
                ["Crawler", latestReport.aiCrawlerReadinessScore],
              ].map(([label, score]) => (
                <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{score}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title="No reports yet. Run your first audit." description="Your newest AI visibility report will appear here after you complete a free audit and lead capture." action={<PrimaryLink href="/#audit">Run Free Audit</PrimaryLink>} />
            </div>
          )}
        </AppCard>

        <AppCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Plan status</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{access.rawPlanName || access.planName}</h2>
            </div>
            <StatusPill tone={access.qaAccess ? "cyan" : access.verifiedPaidAccess ? "green" : "amber"}>{access.qaAccess ? "Admin QA access active" : access.status}</StatusPill>
          </div>
          <div className="mt-5 grid gap-3 text-sm font-semibold text-slate-700">
            {[
              ["Signed in", user.email],
              ["Renewal/reset", hasWorkspaceAccess ? (access.qaAccess ? "QA mode" : formatDate(getAdvisorResetDate(access))) : "Not active"],
              ["Competitors", hasWorkspaceAccess ? `${access.limits.competitors} domains` : "Locked"],
              ["Full exports", hasWorkspaceAccess ? "PDF and CSV" : "Locked"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
                <span className="text-slate-500">{label}</span>
                <span className="break-all text-right text-slate-950">{value}</span>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 text-xs font-semibold leading-5 text-slate-600">For billing changes, contact support. Upgrade and cancellation automation is not presented as self-serve until it is ready.</p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Profile</Link>
            <Link href="/billing" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Billing</Link>
          </div>
        </AppCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.78fr]">
        <AppCard className="p-6">
          <WorkspaceHeader eyebrow="Previous reports" title="Report history" description="Saved reports linked to your authenticated account. Free report links remain viewable without login through report-specific URLs." action={<Link href="/reports" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">View all</Link>} />
          {reports.length ? (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white md:grid md:grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr_0.8fr]">
                <span>Website</span><span>Date</span><span>AI</span><span>AEO</span><span>GEO</span><span>Actions</span>
              </div>
              {reports.slice(0, 6).map((report) => (
                <div key={report.id} className="grid gap-3 border-t border-slate-100 bg-white px-4 py-4 text-sm leading-6 text-slate-700 md:grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr_0.8fr]">
                  <span className="break-all font-semibold text-slate-950">{report.finalUrl || report.websiteUrl}</span>
                  <span>{formatDate(report.createdAt)}</span>
                  <span>{report.aiVisibilityScore}</span>
                  <span>{report.aeoScore}</span>
                  <span>{report.geoScore}</span>
                  <Link href={`/report?reportId=${report.id}`} className="font-semibold text-violet-700">View report</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6"><EmptyState title="No reports yet. Run your first audit." description="Report history appears after a report is saved against your account." action={<PrimaryLink href="/#audit">Run Free Audit</PrimaryLink>} /></div>
          )}
        </AppCard>

        <AppCard className="p-6">
          <WorkspaceHeader eyebrow="Competitor comparison" title="Competitor workspace" description="Competitor setup is kept gated until verified full access. Free users can preview the value without changing paid access." />
          {hasWorkspaceAccess ? (
            <div className="mt-6 grid gap-3">
              {[
                ["Competitor slots", `${access.limits.competitors}`],
                ["Changes left", `${access.limits.competitorChanges}/${access.limits.competitorChanges}`],
                ["Status", "Ready in Profile"],
              ].map(([label, value]) => <MetricCard key={label} label={label} value={value} />)}
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              <LockedPanel title="Competitor comparison" description="Available in the full report" />
              <LockedPanel title="AI Visibility Advisor" description="Available in the full report" />
              <LockedPanel title="Full downloads" description="Available in the full report" />
            </div>
          )}
        </AppCard>
      </section>

      <section id="adviser">
        {advisorReport ? (
          <AdvisorChat currentReportData={advisorReport} planType={access.planName} subscriptionId={access.subscriptionId} reportId={latestReport?.id ?? null} resetDate={getAdvisorResetDate(access)} />
        ) : (
          <AppCard className="p-6">
            <StatusPill tone="amber">AI Visibility Advisor</StatusPill>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Advisor unlocks with verified paid access and a saved report.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Free users can view limited reports and download limited PDFs. Full report chat stays locked until account records confirm full access.</p>
          </AppCard>
        )}
      </section>
    </DashboardShell>
  );
}
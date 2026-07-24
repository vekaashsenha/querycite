import Link from "next/link";
import { AdvisorChat } from "@/components/AdvisorChat";
import { DashboardShell, WorkspaceHeader } from "@/components/DashboardShell";
import { FeedbackCta } from "@/components/FeedbackCta";
import { First20ProTrialOffer } from "@/components/First20ProTrialOffer";
import { AppCard, EmptyState, LockedPanel, MetricCard, PrimaryLink, StatusPill } from "@/components/ui";
import { getAdvisorResetDate, getPaidAccessContextForUser, getReportsForAuthenticatedUser } from "@/lib/paid-foundation";
import { getProTrialStatusForUser } from "@/lib/pro-trial";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";

function formatDate(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function ScoreBar({ label, score, tone }: { label: string; score: number; tone: string }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
        <p className="text-lg font-semibold text-slate-950">{score}</p>
      </div>
      <div className="mt-3 h-2 rounded-full bg-white">
        <div className={`h-2 rounded-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  const user = await requireAuthenticatedUser("/dashboard");
  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);
  const reports = await getReportsForAuthenticatedUser(user);
  const proTrialStatus = await getProTrialStatusForUser(user);
  const latestReport = reports[0] ?? null;
  const hasWorkspaceAccess = access.verifiedPaidAccess || access.qaAccess;
  const advisorReport = hasWorkspaceAccess ? latestReport?.fullReportData ?? null : null;
  const latestScore = latestReport ? `${latestReport.aiVisibilityScore}/100` : "—";
  const badgeText = access.qaAccess ? "Admin" : access.isPaidBetaAccess ? "Beta active" : access.isExpiredBetaAccess ? "Beta expired" : access.verifiedPaidAccess ? "Full access" : "Free";
  const badgeTone = access.qaAccess ? "cyan" : access.isPaidBetaAccess ? "green" : access.isExpiredBetaAccess ? "amber" : access.verifiedPaidAccess ? "green" : "slate";

  return (
    <DashboardShell
      user={{ email: user.email, name: user.name, isAdmin: access.isAdmin }}
      title="Overview"
      description="Scores, reports, Advisor access, and account status in one workspace."
      badge={<StatusPill tone={badgeTone}>{badgeText}</StatusPill>}
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Latest score" value={latestScore} detail={latestReport ? latestReport.finalUrl || latestReport.websiteUrl : "Run your first audit"} tone="violet" />
        <MetricCard label="Reports generated" value={reports.length} detail="Linked to this account" tone="green" />
        <MetricCard label="Advisor credits" value={hasWorkspaceAccess ? access.limits.advisorCredits : 0} detail={hasWorkspaceAccess ? "Available per billing period" : "Unlock with full access"} tone="cyan" />
        <MetricCard label="Competitor updates" value={hasWorkspaceAccess ? access.limits.competitorChanges : "Locked"} detail="Available this period" tone="amber" />
      </section>

      <First20ProTrialOffer initialStatus={proTrialStatus} userEmail={user.email} defaultCompanyName={user.name} />

      <FeedbackCta variant="card" />

      {access.isExpiredBetaAccess ? (
        <AppCard className="border-amber-200 bg-amber-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <StatusPill tone="amber">Paid beta access expired</StatusPill>
              <h2 className="mt-3 text-xl font-semibold text-slate-950">Your 1-month access has ended.</h2>
              <p className="mt-2 text-sm text-slate-700">Renew to reopen full reports, exports, competitor comparison, and AI Advisor.</p>
            </div>
            <Link href="/pricing" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Renew or upgrade</Link>
          </div>
        </AppCard>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.7fr]">
        <AppCard className="p-6">
          <WorkspaceHeader
            eyebrow="Latest report"
            title={latestReport ? latestReport.finalUrl || latestReport.websiteUrl : "Run your first audit"}
            description={latestReport ? `Scanned ${formatDate(latestReport.createdAt)}` : "Your newest report will appear here."}
            action={<PrimaryLink href="/#audit">Run New Audit</PrimaryLink>}
          />
          {latestReport ? (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <ScoreBar label="AI Visibility" score={latestReport.aiVisibilityScore} tone="bg-violet-600" />
              <ScoreBar label="AEO" score={latestReport.aeoScore} tone="bg-fuchsia-500" />
              <ScoreBar label="GEO" score={latestReport.geoScore} tone="bg-emerald-500" />
              <ScoreBar label="Crawler readiness" score={latestReport.aiCrawlerReadinessScore} tone="bg-cyan-500" />
            </div>
          ) : (
            <div className="mt-6">
              <EmptyState title="No reports yet" description="Run a free audit to create your first AI visibility report." action={<PrimaryLink href="/#audit">Run Free Audit</PrimaryLink>} />
            </div>
          )}
        </AppCard>

        <AppCard className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-violet-700">Access</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">{access.rawPlanName || access.planName}</h2>
            </div>
            <StatusPill tone={badgeTone}>{badgeText}</StatusPill>
          </div>
          <div className="mt-5 grid gap-3">
            {[
              ["Valid until", hasWorkspaceAccess ? (access.qaAccess ? "Admin access" : formatDate(access.accessEndsAt ?? getAdvisorResetDate(access))) : "Not active"],
              ["Competitors", hasWorkspaceAccess ? `${access.limits.competitors} domains` : "Locked"],
              ["Exports", hasWorkspaceAccess ? "Full PDF + CSV" : "Free PDF"],
              ["Beta offer", access.couponCode ? "Cohort offer applied" : "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold">
                <span className="text-slate-500">{label}</span>
                <span className="text-right text-slate-950">{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Profile</Link>
            <Link href="/billing" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Billing</Link>
          </div>
        </AppCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.72fr]">
        <AppCard className="p-6">
          <WorkspaceHeader eyebrow="History" title="Previous reports" description="Open saved reports linked to this account." action={<Link href="/reports" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">View all</Link>} />
          {reports.length ? (
            <div className="mt-6 grid gap-3">
              {reports.slice(0, 5).map((report) => (
                <div key={report.id} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm md:grid-cols-[1.5fr_0.7fr_0.5fr_auto] md:items-center">
                  <span className="break-all font-semibold text-slate-950">{report.finalUrl || report.websiteUrl}</span>
                  <span className="text-slate-600">{formatDate(report.createdAt)}</span>
                  <span className="font-semibold text-violet-700">{report.aiVisibilityScore}/100</span>
                  <Link href={`/report?reportId=${report.id}`} className="font-semibold text-slate-950">View report →</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6"><EmptyState title="No saved reports" description="Reports appear after an audit is saved to your account." action={<PrimaryLink href="/#audit">Run Free Audit</PrimaryLink>} /></div>
          )}
        </AppCard>

        <AppCard className="p-6">
          <WorkspaceHeader eyebrow="Competitors" title="Comparison workspace" description="Track competitor readiness and gap priorities." />
          {hasWorkspaceAccess ? (
            <div className="mt-6 grid gap-3">
              <MetricCard label="Competitor slots" value={access.limits.competitors} />
              <MetricCard label="Changes per period" value={access.limits.competitorChanges} />
              <Link href="/profile#competitors" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Manage competitors</Link>
            </div>
          ) : (
            <div className="mt-6 grid gap-4">
              <LockedPanel title="Competitor comparison" description="Available in the full report" />
              <LockedPanel title="AI Visibility Advisor" description="Available in the full report" />
            </div>
          )}
        </AppCard>
      </section>

      <section id="adviser">
        {advisorReport ? (
          <AdvisorChat
            currentReportData={advisorReport}
            planType={access.qaAccess ? "adminQa" : access.planName}
            subscriptionId={access.subscriptionId}
            reportId={latestReport?.id ?? null}
            resetDate={getAdvisorResetDate(access)}
          />
        ) : (
          <AppCard className="p-6">
            <StatusPill tone="amber">AI Visibility Advisor</StatusPill>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Advisor needs full access and a saved report.</h2>
            <p className="mt-2 text-sm text-slate-600">Your free report and recommended fixes remain available now.</p>
          </AppCard>
        )}
      </section>
    </DashboardShell>
  );
}


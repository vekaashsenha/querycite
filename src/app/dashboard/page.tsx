import Link from "next/link";
import { AdvisorChat } from "@/components/AdvisorChat";
import { ClayCard, LockedPanel, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
import { getAdvisorResetDate, getPaidAccessContext, getReportsForPaidContext } from "@/lib/paid-foundation";

type DashboardPageProps = {
  searchParams?: Promise<{ subscription_id?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const params = searchParams ? await searchParams : {};
  const subscriptionId = firstParam(params.subscription_id) ?? null;
  const access = await getPaidAccessContext(subscriptionId);
  const reports = await getReportsForPaidContext(access);
  const latestReport = reports[0] ?? null;
  const advisorReport = latestReport?.fullReportData ?? null;
  const query = subscriptionId ? `?subscription_id=${encodeURIComponent(subscriptionId)}` : "";

  if (!access.verifiedPaidAccess) {
    return (
      <main className="px-5 py-14 sm:px-8">
        <PageIntro
          eyebrow="Dashboard"
          title="Your paid dashboard unlocks after verified access."
          description="QueryCite only unlocks report history, full downloads, competitor management, and AI Advisor after Supabase confirms active paid access."
        />
        <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-3">
          <LockedPanel title="Report history" description="Available after verified paid access" />
          <LockedPanel title="Competitor comparison" description="Available after verified paid access" />
          <LockedPanel title="AI Visibility Advisor" description="Unlock AI Visibility Advisor to ask report-specific questions and generate AEO/GEO fixes." />
        </section>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <PrimaryLink href="/#audit">Run Free Audit</PrimaryLink>
          <Link href="/pricing" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:border-slate-950">View Pricing</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 py-14 sm:px-8">
      <PageIntro
        eyebrow="Paid dashboard"
        title="QueryCite report workspace"
        description="Review current and previous AI Visibility reports, manage competitors, watch usage limits, and continue report-specific Advisor work."
      />

      <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-4">
        {[
          ["Current plan", access.rawPlanName || access.planName],
          ["Subscription status", access.status],
          ["Advisor credits", `0 / ${access.limits.advisorCredits} used`],
          ["Resets on", formatDate(getAdvisorResetDate(access))],
        ].map(([label, value]) => (
          <ClayCard key={label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-3 text-xl font-semibold text-slate-950">{value}</p>
          </ClayCard>
        ))}
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.8fr]">
        <ClayCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <StatusPill tone="green">Latest report</StatusPill>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Current AI Visibility report</h2>
            </div>
            <PrimaryLink href={`/#audit`}>Run New Audit</PrimaryLink>
          </div>
          {latestReport ? (
            <div className="mt-6 grid gap-4">
              <div className="grid gap-3 rounded-3xl border border-slate-100 bg-slate-50 p-5 md:grid-cols-4">
                <div className="md:col-span-2">
                  <p className="text-sm font-semibold text-slate-950">{latestReport.finalUrl || latestReport.websiteUrl}</p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">Report date: {formatDate(latestReport.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">AI Visibility</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{latestReport.aiVisibilityScore}/100</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Crawler readiness</p>
                  <p className="mt-1 text-2xl font-semibold text-slate-950">{latestReport.aiCrawlerReadinessScore}/100</p>
                </div>
              </div>
              <div className="grid gap-3">
                {latestReport.findings.map((finding) => (
                  <div key={finding.issue} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-slate-700">
                    <span className="font-semibold text-slate-950">{finding.priority}:</span> {finding.issue}
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Link href={`/report?reportId=${latestReport.id}&subscription_id=${encodeURIComponent(subscriptionId ?? "")}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">View Report</Link>
                <Link href={`/report?reportId=${latestReport.id}&subscription_id=${encodeURIComponent(subscriptionId ?? "")}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-violet-200 bg-violet-50 px-5 text-sm font-semibold text-violet-800">Download PDF</Link>
                <Link href={`/report?reportId=${latestReport.id}&subscription_id=${encodeURIComponent(subscriptionId ?? "")}`} className="inline-flex min-h-11 items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-5 text-sm font-semibold text-emerald-800">Download CSV</Link>
              </div>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold leading-6 text-slate-600">No reports yet. Run your first audit.</p>
          )}
        </ClayCard>

        <ClayCard>
          <StatusPill tone="violet">Usage limits</StatusPill>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">This billing period</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Advisor credits", `${access.limits.advisorCredits} total`],
              ["Blog briefs", `${access.limits.blogBriefs} included`],
              ["Fix packs", `${access.limits.fixPacks} included`],
              ["Competitor advice", `Up to ${access.limits.competitors} competitors`],
              ["Competitor changes", `${access.limits.competitorChanges} changes per period`],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <span>{label}</span>
                <span>{value}</span>
              </div>
            ))}
          </div>
        </ClayCard>
      </section>

      <section className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.85fr]">
        <ClayCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Previous reports</h2>
            <StatusPill tone="green">Paid history</StatusPill>
          </div>
          {reports.length ? (
            <div className="mt-5 overflow-hidden rounded-3xl border border-slate-100">
              <div className="grid gap-3 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white md:grid-cols-[1.5fr_0.7fr_0.55fr_0.55fr_0.8fr]">
                <span>Website</span><span>Date</span><span>AI</span><span>Crawler</span><span>Actions</span>
              </div>
              {reports.map((report) => (
                <div key={report.id} className="grid gap-3 border-t border-slate-100 bg-white px-4 py-4 text-sm leading-6 text-slate-700 md:grid-cols-[1.5fr_0.7fr_0.55fr_0.55fr_0.8fr]">
                  <span className="break-all font-semibold text-slate-950">{report.finalUrl || report.websiteUrl}</span>
                  <span>{formatDate(report.createdAt)}</span>
                  <span>{report.aiVisibilityScore}</span>
                  <span>{report.aiCrawlerReadinessScore}</span>
                  <Link href={`/report?reportId=${report.id}&subscription_id=${encodeURIComponent(subscriptionId ?? "")}`} className="font-semibold text-violet-700">View / Download</Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold text-slate-600">No saved paid reports are tied to this verified subscription yet.</p>
          )}
        </ClayCard>

        <ClayCard>
          <h2 className="text-2xl font-semibold text-slate-950">Competitor comparison</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Add competitors to start comparison. The MVP enforces 3 competitors and 3 changes per billing period.</p>
          <div className="mt-5 grid gap-3">
            {[
              "Your website vs competitor scores",
              "AI Crawler Readiness Score",
              "Schema readiness",
              "Content clarity",
              "llms.txt status",
              "Top gaps and priority recommendations",
            ].map((item) => <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-700">{item}</div>)}
          </div>
          <div className="mt-5">
            <Link href={`/profile${query}`} className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Manage competitors</Link>
          </div>
        </ClayCard>
      </section>

      <section className="mx-auto mt-8 max-w-7xl">
        {advisorReport ? (
          <AdvisorChat currentReportData={advisorReport} planType={access.planName === "free" ? "starter" : access.planName} subscriptionId={subscriptionId} reportId={latestReport?.id ?? null} resetDate={getAdvisorResetDate(access)} />
        ) : (
          <ClayCard>
            <StatusPill tone="amber">AI Visibility Advisor</StatusPill>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Run an audit first to activate AI Advisor.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Advisor responses are tied to report data and do not work as a general chatbot.</p>
          </ClayCard>
        )}
      </section>
    </main>
  );
}
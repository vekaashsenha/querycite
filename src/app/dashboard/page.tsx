import Link from "next/link";
import { AdvisorChat } from "@/components/AdvisorChat";
import { ClayCard, LockedPanel, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
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
  const advisorReport = access.verifiedPaidAccess ? latestReport?.fullReportData ?? null : null;

  return (
    <main className="px-5 py-14 sm:px-8">
      <PageIntro
        eyebrow="Dashboard"
        title="Your QueryCite workspace"
        description="Review saved reports, account status, paid access, competitor setup, and report-specific Advisor work from one secure account."
      />

      <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-4">
        {[
          ["Signed in", user.email],
          ["Access status", access.verifiedPaidAccess ? "Full report active" : "Free account"],
          ["Current plan", access.rawPlanName || access.planName],
          ["Renewal/reset", access.verifiedPaidAccess ? formatDate(getAdvisorResetDate(access)) : "Not active"],
        ].map(([label, value]) => (
          <ClayCard key={label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
            <p className="mt-3 break-all text-lg font-semibold text-slate-950">{value}</p>
          </ClayCard>
        ))}
      </section>

      {!access.verifiedPaidAccess ? (
        <section className="mx-auto mt-8 max-w-7xl rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-semibold leading-6 text-amber-900">
          Full report sections, competitor management, full downloads, billing details, and AI Advisor require verified paid access from Supabase subscription/payment records. Free reports remain available below.
        </section>
      ) : null}

      <section className="mx-auto mt-8 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.8fr]">
        <ClayCard>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <StatusPill tone={latestReport ? "green" : "amber"}>Saved reports</StatusPill>
              <h2 className="mt-3 text-2xl font-semibold text-slate-950">Report history</h2>
            </div>
            <PrimaryLink href="/#audit">Run New Audit</PrimaryLink>
          </div>
          {reports.length ? (
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-100">
              <div className="grid gap-3 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white md:grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr_0.8fr]">
                <span>Website</span><span>Date</span><span>AI</span><span>AEO</span><span>GEO</span><span>Actions</span>
              </div>
              {reports.map((report) => (
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
            <p className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-sm font-semibold leading-6 text-slate-600">No saved reports are linked to this account yet. If you used the same email for a previous free audit, log out and back in after the lead email is saved, or run a fresh audit while logged in.</p>
          )}
        </ClayCard>

        <ClayCard>
          <StatusPill tone={access.verifiedPaidAccess ? "green" : "slate"}>{access.verifiedPaidAccess ? "Verified paid access" : "Locked"}</StatusPill>
          <h2 className="mt-3 text-2xl font-semibold text-slate-950">Paid workspace</h2>
          <div className="mt-5 grid gap-3">
            {[
              ["Advisor credits", access.verifiedPaidAccess ? `${access.limits.advisorCredits} total` : "Available in full report"],
              ["Competitors", access.verifiedPaidAccess ? `${access.limits.competitors} domains` : "Available in full report"],
              ["Competitor changes", access.verifiedPaidAccess ? `${access.limits.competitorChanges} changes per period` : "Available in full report"],
              ["Full exports", access.verifiedPaidAccess ? "PDF and CSV" : "Available in full report"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
                <span>{label}</span><span>{value}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/profile" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Profile</Link>
            <Link href="/billing" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Billing</Link>
          </div>
        </ClayCard>
      </section>

      {!access.verifiedPaidAccess ? (
        <section className="mx-auto mt-8 grid max-w-7xl gap-5 lg:grid-cols-3">
          <LockedPanel title="Competitor comparison" description="Requires login plus verified paid access" />
          <LockedPanel title="AI Visibility Advisor" description="Requires login plus verified paid access" />
          <LockedPanel title="Full downloads" description="Requires login plus verified paid access" />
        </section>
      ) : null}

      <section className="mx-auto mt-8 max-w-7xl">
        {advisorReport ? (
          <AdvisorChat currentReportData={advisorReport} planType={access.planName} subscriptionId={access.subscriptionId} reportId={latestReport?.id ?? null} resetDate={getAdvisorResetDate(access)} />
        ) : (
          <ClayCard>
            <StatusPill tone="amber">AI Visibility Advisor</StatusPill>
            <h2 className="mt-3 text-2xl font-semibold text-slate-950">Advisor unlocks with verified paid access and a saved report.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Free users can view limited reports and download limited PDFs. Full report chat stays locked until Supabase confirms paid access.</p>
          </ClayCard>
        )}
      </section>
    </main>
  );
}

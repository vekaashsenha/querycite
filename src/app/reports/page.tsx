import Link from "next/link";
import { ClayCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
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
    <main className="px-5 py-14 sm:px-8">
      <PageIntro
        eyebrow="Report history"
        title="Saved QueryCite reports"
        description="Reports linked to your authenticated account appear here. Free report links remain viewable without login, but saved history requires an account."
      />
      <section className="mx-auto mt-10 max-w-6xl">
        <ClayCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Your reports</h2>
            <StatusPill tone={reports.length ? "green" : "amber"}>{reports.length ? `${reports.length} saved` : "No reports yet"}</StatusPill>
          </div>
          {reports.length ? (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
                <thead>
                  <tr>{["Website URL", "Scan date", "AI Visibility", "AEO", "GEO", "View report"].map((column) => <th key={column} className="px-3 py-2 font-semibold text-slate-500">{column}</th>)}</tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="rounded-2xl bg-slate-50 text-slate-600">
                      <td className="px-3 py-4 font-semibold text-slate-950">{report.finalUrl || report.websiteUrl}</td>
                      <td className="px-3 py-4">{formatDate(report.createdAt)}</td>
                      <td className="px-3 py-4">{report.aiVisibilityScore}</td>
                      <td className="px-3 py-4">{report.aeoScore}</td>
                      <td className="px-3 py-4">{report.geoScore}</td>
                      <td className="px-3 py-4"><Link href={`/report?reportId=${report.id}`} className="font-semibold text-violet-700">Open</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-5 text-center text-sm font-semibold text-slate-600">Run a free audit or open a report link sent to this email, then return here after login.</p>
          )}
          <div className="mt-6 flex flex-wrap gap-3">
            <PrimaryLink href="/#audit">Run Free Audit</PrimaryLink>
            <Link href="/dashboard" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Back to dashboard</Link>
          </div>
        </ClayCard>
      </section>
    </main>
  );
}

import Link from "next/link";
import { ClayCard, PageIntro, StatusPill } from "@/components/ui";

const reportColumns = ["Website URL", "Scan date", "AI Visibility", "AEO", "GEO", "CSV export", "PDF preview", "View report"];

export default function ReportsPage() {
  return (
    <main className="px-5 py-14 sm:px-8">
      <PageIntro
        eyebrow="Report history"
        title="Saved reports foundation"
        description="Saved report history will be available after beta login is enabled. The free audit and current report view remain available without login."
      />
      <section className="mx-auto mt-10 max-w-6xl">
        <ClayCard>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Report history preview</h2>
            <StatusPill tone="amber">Beta placeholder</StatusPill>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[760px] border-separate border-spacing-y-2 text-left text-sm">
              <thead>
                <tr>{reportColumns.map((column) => <th key={column} className="px-3 py-2 font-semibold text-slate-500">{column}</th>)}</tr>
              </thead>
              <tbody>
                <tr className="rounded-2xl bg-slate-50 text-slate-600">
                  <td colSpan={reportColumns.length} className="px-3 py-5 text-center font-semibold">
                    Saved reports will appear here after beta login and Supabase report storage are enabled.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/#audit" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white">Run Free Audit</Link>
            <Link href="/report" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Open latest local report</Link>
          </div>
        </ClayCard>
      </section>
    </main>
  );
}
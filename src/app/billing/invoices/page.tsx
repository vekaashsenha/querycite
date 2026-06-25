import Link from "next/link";
import { DashboardShell, WorkspaceHeader } from "@/components/DashboardShell";
import { AppCard, EmptyState, StatusPill } from "@/components/ui";
import { formatPaise, getPaymentHistoryForUser, isPaidPaymentRecord, receiptNumberForPayment } from "@/lib/paid-foundation";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { isAdminUser } from "@/lib/auth/server";

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
}

function planLabel(value: string | null) {
  if (!value) return "QueryCite access";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function InvoicesPage() {
  const user = await requireAuthenticatedUser("/billing/invoices");
  await syncAuthenticatedUser(user);
  const isAdmin = await isAdminUser(user);
  const payments = (await getPaymentHistoryForUser(user)).filter(isPaidPaymentRecord);

  return (
    <DashboardShell
      user={{ email: user.email, name: user.name, isAdmin }}
      title="Invoices & receipts"
      description="Payment receipts linked to your QueryCite account."
      badge={<StatusPill tone={payments.length ? "green" : "slate"}>{payments.length ? `${payments.length} receipt${payments.length === 1 ? "" : "s"}` : "No receipts"}</StatusPill>}
    >
      <AppCard className="p-6">
        <WorkspaceHeader
          eyebrow="Billing history"
          title="Invoices & receipts"
          description="Open a receipt to print it or save it as a PDF."
          action={<Link href="/billing" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Back to billing</Link>}
        />
        {payments.length ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
            <div className="hidden bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-white md:grid md:grid-cols-[0.7fr_1fr_0.7fr_0.65fr_1fr_auto]">
              <span>Date</span><span>Plan / access</span><span>Amount</span><span>Status</span><span>Access period</span><span>Receipt</span>
            </div>
            {payments.map((payment) => (
              <div key={payment.id} className="grid gap-3 border-t border-slate-100 bg-white px-4 py-4 text-sm text-slate-700 md:grid-cols-[0.7fr_1fr_0.7fr_0.65fr_1fr_auto] md:items-center">
                <span>{formatDate(payment.createdAt)}</span>
                <span>
                  <span className="block font-semibold text-slate-950">{planLabel(payment.planName)}</span>
                  <span className="mt-1 block text-xs text-slate-500">{receiptNumberForPayment(payment)}</span>
                </span>
                <span className="font-semibold text-slate-950">{formatPaise(payment.amount, payment.currency)}</span>
                <span className="capitalize">{payment.status}</span>
                <span>{formatDate(payment.accessStartsAt)} to {formatDate(payment.accessEndsAt)}</span>
                <Link href={`/billing/invoices/${payment.id}`} target="_blank" rel="noreferrer" className="font-semibold text-violet-700">View receipt</Link>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6"><EmptyState title="No receipts yet" description="A receipt appears here after a payment is confirmed." /></div>
        )}
      </AppCard>
    </DashboardShell>
  );
}

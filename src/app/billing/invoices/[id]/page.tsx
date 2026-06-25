import Link from "next/link";
import { notFound } from "next/navigation";
import { PrintReceiptButton } from "@/components/PrintReceiptButton";
import { formatPaise, getPaymentForUserById, isPaidPaymentRecord, receiptNumberForPayment } from "@/lib/paid-foundation";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";

function formatDate(value: string | null | undefined, includeTime = false) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-IN", includeTime
    ? { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }
    : { day: "2-digit", month: "short", year: "numeric" });
}

function planLabel(value: string | null) {
  if (!value) return "QueryCite access";
  return value.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuthenticatedUser("/billing/invoices");
  await syncAuthenticatedUser(user);
  const { id } = await params;
  const payment = await getPaymentForUserById(user, id);
  if (!payment || !isPaidPaymentRecord(payment)) notFound();

  const rows = [
    ["Customer", user.name || "-"],
    ["Email", user.email],
    ["Plan / access", planLabel(payment.planName)],
    ["Amount paid", formatPaise(payment.amount, payment.currency)],
    ["Currency", payment.currency],
    ["Payment date", formatDate(payment.createdAt, true)],
    ["Payment status", payment.status],
    ["Razorpay payment ID", payment.razorpayPaymentId || "-"],
    ["Razorpay order ID", payment.razorpayOrderId || "-"],
    ["Access starts", formatDate(payment.accessStartsAt)],
    ["Access ends", formatDate(payment.accessEndsAt)],
  ];

  return (
    <main className="receipt-page px-5 py-12 sm:px-8">
      <section className="mx-auto max-w-3xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <div className="print-hidden mb-8 flex flex-wrap items-center justify-between gap-3">
          <Link href="/billing/invoices" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Back to receipts</Link>
          <PrintReceiptButton />
        </div>

        <div className="flex flex-wrap items-start justify-between gap-6 border-b border-slate-200 pb-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">QueryCite</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950">Payment Receipt</h1>
            <p className="mt-2 text-sm text-slate-600">querycite.com</p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Receipt number</p>
            <p className="mt-2 font-mono text-sm font-semibold text-slate-950">{receiptNumberForPayment(payment)}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3">
          {rows.map(([label, value]) => (
            <div key={label} className="grid gap-1 border-b border-slate-100 py-3 text-sm sm:grid-cols-[190px_1fr] sm:gap-5">
              <span className="font-semibold text-slate-500">{label}</span>
              <span className="break-all font-semibold text-slate-950 sm:text-right">{value}</span>
            </div>
          ))}
        </div>

        <p className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
          This is a digital SaaS/payment receipt for QueryCite access.
        </p>
      </section>
    </main>
  );
}

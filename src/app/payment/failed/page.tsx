import Link from "next/link";
import { ClayCard, PageIntro, PrimaryLink } from "@/components/ui";

export default function PaymentFailedPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro eyebrow="Payment" title="Payment could not be completed." description="You can try again or contact QueryCite support." />
      <ClayCard className="mx-auto mt-10 max-w-2xl text-center">
        <p className="text-sm leading-6 text-slate-600">No paid access has been activated. If this happened unexpectedly, contact support and include the time of the payment attempt.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <PrimaryLink href="/pricing">Try Again</PrimaryLink>
          <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:border-slate-950">Contact Support</Link>
        </div>
      </ClayCard>
    </main>
  );
}
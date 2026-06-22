import Link from "next/link";
import { ClayCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";

type PaymentSuccessPageProps = {
  searchParams?: Promise<{ subscription_id?: string | string[]; order_id?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = searchParams ? await searchParams : {};
  const subscriptionId = firstParam(params.subscription_id);
  const orderId = firstParam(params.order_id);
  const isOrderPayment = Boolean(orderId);

  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Payment received"
        title={isOrderPayment ? "Payment submitted for verification." : "Payment status submitted."}
        description={isOrderPayment ? "Your paid beta access starts only after Razorpay confirms payment capture through the secure webhook." : "Your QueryCite subscription status will be confirmed after verification."}
      />
      <ClayCard className="mx-auto mt-10 max-w-2xl text-center">
        <StatusPill tone="amber">Webhook verification required</StatusPill>
        {orderId ? <p className="mt-4 break-all text-sm leading-6 text-slate-600">Order ID: {orderId}</p> : null}
        {subscriptionId ? <p className="mt-4 break-all text-sm leading-6 text-slate-600">Subscription ID: {subscriptionId}</p> : null}
        <p className="mt-4 text-sm leading-6 text-slate-600">
          {isOrderPayment
            ? "This page does not unlock paid access by itself. QueryCite unlocks 1-month paid beta access only after the captured payment is stored in verified access records."
            : "This page does not activate paid access by itself. QueryCite uses verified payment and subscription records as the source of truth."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <PrimaryLink href="/dashboard">Go to Dashboard</PrimaryLink>
          <Link href="/report" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:border-slate-950">Open latest report</Link>
        </div>
      </ClayCard>
    </main>
  );
}

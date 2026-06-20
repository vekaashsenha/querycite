import Link from "next/link";
import { ClayCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";

type PaymentSuccessPageProps = {
  searchParams?: Promise<{ subscription_id?: string | string[] }>;
};

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = searchParams ? await searchParams : {};
  const subscriptionId = Array.isArray(params.subscription_id) ? params.subscription_id[0] : params.subscription_id;

  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro eyebrow="Payment test" title="Payment test completed." description="Your QueryCite subscription status will be confirmed after verification." />
      <ClayCard className="mx-auto mt-10 max-w-2xl text-center">
        <StatusPill tone="amber">Webhook verification required</StatusPill>
        {subscriptionId ? <p className="mt-4 break-all text-sm leading-6 text-slate-600">Subscription ID: {subscriptionId}</p> : null}
        <p className="mt-4 text-sm leading-6 text-slate-600">This page does not activate paid access by itself. QueryCite uses verified Razorpay webhooks and Supabase subscription status as the source of truth.</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <PrimaryLink href="/report?demo=full">View Full Report</PrimaryLink>
          <Link href="/dashboard" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:border-slate-950">Go to Dashboard</Link>
        </div>
      </ClayCard>
    </main>
  );
}
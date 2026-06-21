import Link from "next/link";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ClayCard, LockedPanel, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
import { getPaidAccessContext } from "@/lib/paid-foundation";

type ProfilePageProps = {
  searchParams?: Promise<{ subscription_id?: string | string[] }>;
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const params = searchParams ? await searchParams : {};
  const subscriptionId = firstParam(params.subscription_id) ?? null;
  const access = await getPaidAccessContext(subscriptionId);

  if (!access.verifiedPaidAccess || !subscriptionId) {
    return (
      <main className="px-5 py-14 sm:px-8">
        <PageIntro
          eyebrow="Profile"
          title="Company profile unlocks with verified paid access."
          description="Profile, competitor settings, and Advisor context are saved only after Supabase confirms active paid access. Email changes are not supported in the MVP."
        />
        <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-3">
          <LockedPanel title="Company profile" description="Save company context after verified paid access" />
          <LockedPanel title="Competitor settings" description="Manage up to 3 competitors after verified paid access" />
          <LockedPanel title="Advisor context" description="Use profile data to improve report-specific recommendations" />
        </section>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <PrimaryLink href="/pricing">View Pricing</PrimaryLink>
          <Link href="/#audit" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 transition hover:border-slate-950">Run Free Audit</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="px-5 py-14 sm:px-8">
      <PageIntro
        eyebrow="Profile"
        title="Company context for better AI visibility recommendations"
        description="Save company, audience, keywords, geography, tone, and competitor settings. This data is stored server-side and will improve paid Advisor context as account features mature."
      />
      <section className="mx-auto mt-8 max-w-7xl rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-900">
        <StatusPill tone="green">Verified paid access</StatusPill>
        <span className="ml-3">Email is read-only in the MVP. For billing changes, contact support.</span>
      </section>
      <ProfileSettings subscriptionId={subscriptionId} email={access.email} planName={access.rawPlanName ?? access.planName} />
      <section className="mx-auto mt-6 max-w-7xl">
        <ClayCard>
          <h2 className="text-xl font-semibold text-slate-950">Security note</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">These MVP settings are saved through server-side Supabase routes guarded by verified subscription status. They are not exposed through client-side Supabase keys.</p>
        </ClayCard>
      </section>
    </main>
  );
}
import Link from "next/link";
import { ProfileSettings } from "@/components/ProfileSettings";
import { ClayCard, LockedPanel, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";

export default async function ProfilePage() {
  const user = await requireAuthenticatedUser("/profile");
  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);

  if (!access.verifiedPaidAccess || !access.subscriptionId) {
    return (
      <main className="px-5 py-14 sm:px-8">
        <PageIntro
          eyebrow="Profile"
          title="Company profile unlocks with verified paid access."
          description="You are logged in, but profile context, competitor settings, and paid Advisor context require active paid access confirmed in Supabase."
        />
        <section className="mx-auto mt-8 max-w-4xl rounded-3xl border border-white/75 bg-white/85 p-5 text-center text-sm font-semibold leading-6 text-slate-700 shadow-sm">
          Signed in as <span className="text-slate-950">{user.email}</span>
        </section>
        <section className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-3">
          <LockedPanel title="Company profile" description="Requires verified paid access" />
          <LockedPanel title="Competitor settings" description="Requires verified paid access" />
          <LockedPanel title="Advisor context" description="Requires verified paid access" />
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
        description="Save company, audience, keywords, geography, tone, and competitor settings. These settings are tied to your authenticated account and verified paid access."
      />
      <section className="mx-auto mt-8 max-w-7xl rounded-3xl border border-emerald-100 bg-emerald-50 p-5 text-sm font-semibold leading-6 text-emerald-900">
        <StatusPill tone="green">Verified paid access</StatusPill>
        <span className="ml-3">Signed in as {user.email}. Email changes are not supported in the MVP.</span>
      </section>
      <ProfileSettings subscriptionId={access.subscriptionId} email={access.email ?? user.email} planName={access.rawPlanName ?? access.planName} />
      <section className="mx-auto mt-6 max-w-7xl">
        <ClayCard>
          <h2 className="text-xl font-semibold text-slate-950">Security note</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Profile and competitor routes require a logged-in Supabase user plus verified paid access from server-side records.</p>
        </ClayCard>
      </section>
    </main>
  );
}

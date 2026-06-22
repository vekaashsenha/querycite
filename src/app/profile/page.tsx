import Link from "next/link";
import { DashboardShell, WorkspaceHeader } from "@/components/DashboardShell";
import { ProfileSettings } from "@/components/ProfileSettings";
import { AppCard, EmptyState, LockedPanel, PrimaryLink, StatusPill } from "@/components/ui";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";
import { requireAuthenticatedUser, syncAuthenticatedUser } from "@/lib/auth/server";

export default async function ProfilePage() {
  const user = await requireAuthenticatedUser("/profile");
  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);

  const hasProfileAccess = access.verifiedPaidAccess || access.qaAccess;

  if (!hasProfileAccess) {
    return (
      <DashboardShell
        user={{ email: user.email, name: user.name, isAdmin: access.isAdmin }}
        title="Profile"
        description="Company profile, brand context, competitors, and preferences for report-specific recommendations."
        badge={<StatusPill tone="slate">Free account</StatusPill>}
      >
        <AppCard className="p-6">
          <WorkspaceHeader
            eyebrow="Profile"
            title="Company profile unlocks with verified full access"
            description="You are logged in, but profile context, competitor settings, and paid Advisor context require verified full access."
            action={<PrimaryLink href="/pricing">View Pricing</PrimaryLink>}
          />
          <div className="mt-6"><EmptyState title="Profile editing is locked" description={`Signed in as ${user.email}. Free reports remain available, and profile context unlocks when full access is verified.`} action={<Link href="/#audit" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Run Free Audit</Link>} /></div>
        </AppCard>
        <section className="grid gap-4 md:grid-cols-3">
          <LockedPanel title="Company profile" description="Available in the full report" />
          <LockedPanel title="Competitor settings" description="Available in the full report" />
          <LockedPanel title="Advisor context" description="Available in the full report" />
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={{ email: user.email, name: user.name, isAdmin: access.isAdmin }}
      title="Profile"
      description="Save company, audience, keywords, geography, tone, and competitor settings for better report-specific recommendations."
      badge={<StatusPill tone={access.qaAccess ? "cyan" : "green"}>{access.qaAccess ? "Admin preview" : "Verified full access"}</StatusPill>}
    >
      <AppCard className="p-6">
        <WorkspaceHeader
          eyebrow="Profile setup"
          title="Brand context for AI visibility recommendations"
          description="Email changes are not supported yet. Profile and competitor changes stay tied to this authenticated account."
        />
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold leading-6 text-emerald-900">
          {access.qaAccess ? "Admin QA access active. " : ""}Signed in as {user.email}. Competitor changes left this billing period: {access.limits.competitorChanges} / {access.limits.competitorChanges}.
        </div>
      </AppCard>
      <ProfileSettings subscriptionId={access.subscriptionId || `admin-qa-${user.id}`} email={access.email ?? user.email} planName={access.rawPlanName ?? access.planName} />
      <AppCard className="p-6">
        <h2 className="text-xl font-semibold text-slate-950">Security note</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Profile and competitor areas require a logged-in user plus verified paid access.</p>
      </AppCard>
    </DashboardShell>
  );
}
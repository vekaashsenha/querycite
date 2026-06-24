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
        description="Brand context, competitors, and report preferences."
        badge={<StatusPill tone="slate">Free</StatusPill>}
      >
        <AppCard className="p-6">
          <WorkspaceHeader
            eyebrow="Profile"
            title="Brand context unlocks with full access"
            description="Save company, audience, and competitor context for more specific recommendations."
            action={<PrimaryLink href="/pricing">View Pricing</PrimaryLink>}
          />
          <div className="mt-6"><EmptyState title="Profile editing is locked" description={`Signed in as ${user.email}. Free reports remain available.`} action={<Link href="/#audit" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900">Run Free Audit</Link>} /></div>
        </AppCard>
        <section className="grid gap-4 md:grid-cols-3">
          <LockedPanel title="Company profile" description="Available with full access" />
          <LockedPanel title="Competitor settings" description="Available with full access" />
          <LockedPanel title="Advisor context" description="Available with full access" />
        </section>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      user={{ email: user.email, name: user.name, isAdmin: access.isAdmin }}
      title="Profile"
      description="Company, audience, keyword, geography, tone, and competitor context."
      badge={<StatusPill tone={access.qaAccess ? "cyan" : "green"}>{access.qaAccess ? "QA" : "Full access"}</StatusPill>}
    >
      <AppCard className="p-6">
        <WorkspaceHeader
          eyebrow="Profile setup"
          title="Context for sharper recommendations"
          description="Saved context stays tied to this authenticated account."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Signed in as {user.email}</div>
          <div className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm font-semibold text-violet-900">Competitor changes: up to {access.limits.competitorChanges} per period</div>
        </div>
      </AppCard>
      <ProfileSettings subscriptionId={access.subscriptionId || `admin-qa-${user.id}`} email={access.email ?? user.email} planName={access.rawPlanName ?? access.planName} />
    </DashboardShell>
  );
}

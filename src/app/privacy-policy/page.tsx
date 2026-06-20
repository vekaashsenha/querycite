import { ClayCard, SectionHeader } from "@/components/ui";

export default function PrivacyPolicyPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <SectionHeader eyebrow="Legal" title="Privacy Policy" description="Placeholder legal page for the Phase 1 QueryCite website." />
      <ClayCard className="mx-auto mt-10 max-w-3xl">
        <div className="grid gap-5 text-sm leading-7 text-slate-600">
          <p>This Privacy Policy is placeholder copy for Phase 1. QueryCite has not connected authentication, payment, analytics, or live form delivery in this interface. Replace this page with reviewed legal copy before launch.</p>
          <p className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-slate-700">QueryCite is built with DPDP and GDPR-aligned privacy practices.</p>
        </div>
      </ClayCard>
    </main>
  );
}
import { ClayCard, SectionHeader } from "@/components/ui";

export default function PrivacyPolicyPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <SectionHeader eyebrow="Legal" title="Privacy Policy" description="A concise privacy notice for the QueryCite launch website." />
      <ClayCard className="mx-auto mt-10 max-w-3xl">
        <div className="grid gap-5 text-sm leading-7 text-slate-600">
          <p>QueryCite is designed to collect only the information needed to respond to inquiries, understand audit context, and improve the product experience. Any production privacy terms should be reviewed by qualified legal counsel before broad public rollout.</p>
          <p className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-slate-700">QueryCite is built with DPDP and GDPR-aligned privacy practices.</p>
          <p>We aim to be transparent about how website URLs, contact details, and report-related context are handled, and to give teams a clear way to request updates or removal of submitted information.</p>
        </div>
      </ClayCard>
    </main>
  );
}

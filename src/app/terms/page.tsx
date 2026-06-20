import { ClayCard, SectionHeader } from "@/components/ui";

export default function TermsPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <SectionHeader eyebrow="Legal" title="Terms of Service" description="Placeholder legal page for the Phase 1 QueryCite website." />
      <ClayCard className="mx-auto mt-10 max-w-3xl">
        <p className="text-sm leading-7 text-slate-600">These Terms of Service are placeholder copy for Phase 1. The website currently presents mock report data and placeholder CTAs. Replace this page with reviewed legal copy before launch.</p>
      </ClayCard>
    </main>
  );
}
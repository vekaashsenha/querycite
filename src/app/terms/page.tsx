import { ClayCard, SectionHeader } from "@/components/ui";

export default function TermsPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <SectionHeader eyebrow="Legal" title="Terms of Service" description="A concise terms notice for the QueryCite launch website." />
      <ClayCard className="mx-auto mt-10 max-w-3xl">
        <div className="grid gap-5 text-sm leading-7 text-slate-600">
          <p>QueryCite provides AI visibility audit previews and AEO/GEO readiness guidance for informational and planning purposes. The product does not guarantee citations, rankings, traffic, or revenue outcomes.</p>
          <p>Teams should review generated recommendations, report content, and implementation notes before using them in public website copy, structured data, or client deliverables.</p>
          <p>These terms should be reviewed and finalized by qualified legal counsel before broad public rollout.</p>
        </div>
      </ClayCard>
    </main>
  );
}

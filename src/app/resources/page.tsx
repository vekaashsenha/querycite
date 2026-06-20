import { ClayCard, PageIntro, StatusPill } from "@/components/ui";
import { resources } from "@/lib/mock";

function toneForStatus(status: string): "green" | "slate" {
  if (status === "Available") return "green";
  return "slate";
}

export default function ResourcesPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Resources"
        title="Static Phase 1 resource library"
        description="A launch-ready placeholder for educational resources without adding a CMS, database, admin panel, or publishing workflow yet."
      />
      <section className="mx-auto mt-10 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {resources.map(([title, description, status]) => (
          <ClayCard key={title} className="transition hover:-translate-y-1">
            <StatusPill tone={toneForStatus(status)}>{status}</StatusPill>
            <h2 className="mt-5 text-xl font-semibold leading-7 text-slate-950">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          </ClayCard>
        ))}
      </section>
      <p className="mx-auto mt-8 max-w-3xl text-center text-sm leading-6 text-slate-500">
        For Phase 1, Resources are static. Later this can move to MDX or a CMS when publishing workflow requirements are defined.
      </p>
    </main>
  );
}
import { ClayCard, PageIntro, PrimaryLink, StatusPill } from "@/components/ui";
import { useCases } from "@/lib/mock";

export default function UseCasesPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro
        eyebrow="Use cases"
        title="AI search readiness for every team that owns visibility"
        description="QueryCite helps SaaS brands, B2B companies, agencies, SEO teams, content teams, and founders understand AI visibility gaps and plan practical fixes."
      />
      <section className="mx-auto mt-10 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {useCases.map(([title, description]) => (
          <ClayCard key={title} className="transition hover:-translate-y-1">
            <StatusPill tone="slate">Use case</StatusPill>
            <h2 className="mt-5 text-xl font-semibold leading-7 text-slate-950">{title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
          </ClayCard>
        ))}
      </section>
      <section className="mx-auto mt-12 max-w-7xl rounded-[2rem] bg-slate-950 p-8 text-center text-white sm:p-10">
        <h2 className="text-3xl font-semibold leading-tight">Start with a free visibility audit</h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">Review how QueryCite frames scores, findings, and next steps for AI search readiness.</p>
        <div className="mt-7"><PrimaryLink href="/#audit">Run Free Audit</PrimaryLink></div>
      </section>
    </main>
  );
}

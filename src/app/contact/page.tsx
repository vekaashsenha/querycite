import { ContactForm } from "@/components/ContactForm";
import { ClayCard, SectionHeader, StatusPill } from "@/components/ui";

const audiences = [
  ["For agencies", "Preview client-ready AI visibility reporting and future team workflows."],
  ["For SaaS brands", "Find why AI search may not understand, cite, or recommend your product."],
  ["For B2B teams", "Turn visibility gaps into content, schema, and developer action notes."],
  ["For technical support", "Use this placeholder contact path for implementation questions."],
];

export default function ContactPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <SectionHeader eyebrow="Contact" title="Contact QueryCite" description="Use the Phase 1 contact form UI to share your website, team context, and questions. Submission is mocked for now." />
      <section className="mx-auto mt-10 grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="grid gap-4">
          {audiences.map(([title, description]) => (
            <ClayCard key={title}>
              <StatusPill>{title}</StatusPill>
              <p className="mt-4 text-sm leading-6 text-slate-600">{description}</p>
            </ClayCard>
          ))}
        </div>
        <ContactForm />
      </section>
    </main>
  );
}
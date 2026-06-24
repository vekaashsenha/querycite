import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { ClayCard, SectionHeader, StatusPill } from "@/components/ui";

const audiences = [
  ["Agencies", "Client-ready visibility reports and practical team workflows."],
  ["SaaS brands", "Find gaps in entity clarity, answer coverage, schema, and crawler readiness."],
  ["B2B teams", "Turn audit signals into content, schema, and developer actions."],
];

export default function ContactPage() {
  return (
    <main className="px-5 py-16 sm:px-8">
      <SectionHeader eyebrow="Contact" title="Contact QueryCite" description="Share your website, team context, or payment question. We will route it to the right place." />
      <section className="mx-auto mt-10 grid max-w-7xl gap-8 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="grid content-start gap-4">
          {audiences.map(([title, description]) => (
            <ClayCard key={title}>
              <StatusPill>{title}</StatusPill>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </ClayCard>
          ))}
          <ClayCard className="bg-slate-950 text-white">
            <h2 className="text-xl font-semibold">Direct email</h2>
            <div className="mt-4 grid gap-2 text-sm font-semibold text-slate-200">
              <Link href="mailto:hello@querycite.com">hello@querycite.com</Link>
              <Link href="mailto:support@querycite.com">support@querycite.com</Link>
              <Link href="mailto:billing@querycite.com">billing@querycite.com</Link>
            </div>
          </ClayCard>
        </div>
        <ContactForm />
      </section>
    </main>
  );
}

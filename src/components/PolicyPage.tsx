import type { ReactNode } from "react";
import { AppCard, PageIntro } from "@/components/ui";

type PolicySection = {
  title: string;
  content: ReactNode;
};

export function PolicyPage({ title, description, sections }: { title: string; description: string; sections: PolicySection[] }) {
  return (
    <main className="px-5 py-16 sm:px-8">
      <PageIntro eyebrow="Legal" title={title} description={description} />
      <div className="mx-auto mt-10 grid max-w-4xl gap-4">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Last updated: June 24, 2026</p>
        {sections.map((section, index) => (
          <AppCard key={section.title} className="p-6 sm:p-7">
            <div className="flex gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-xs font-bold text-white">{String(index + 1).padStart(2, "0")}</span>
              <div className="min-w-0">
                <h2 className="text-xl font-semibold text-slate-950">{section.title}</h2>
                <div className="mt-3 grid gap-3 text-sm leading-7 text-slate-600">{section.content}</div>
              </div>
            </div>
          </AppCard>
        ))}
      </div>
    </main>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { featureCards, faqs, integrations, mockReport, useCases } from "@/lib/mock";
import { normalizeWebsiteUrl, urlErrorMessage } from "@/lib/url";
import { ClayCard, LockedPanel, PrimaryLink, ScoreRing, SectionHeader, StatusPill } from "@/components/ui";

const scanSteps = ["Scanning website", "Checking AI visibility signals", "Reviewing AEO/GEO gaps", "Preparing report"];
const valueItems = ["Citation readiness", "AEO/GEO fixes", "Competitor gaps", "Export-ready reports"];
const problemCards = [
  ["AI search cannot explain you clearly", "Weak entity signals make it harder for AI systems to identify what your brand does and who it serves."],
  ["Pages are not answer-ready", "Useful content often lacks concise answers, FAQs, proof points, and structure that AI can summarize."],
  ["Competitors may look more citeable", "Brands with clearer positioning, schema, trust signals, and content coverage can appear easier to recommend."],
];
const outputCards = ["Limited branded PDF", "Basic CSV", "Share locked report preview", "Email report option"];

function ScanState({ progress }: { progress: number }) {
  const activeStep = Math.min(scanSteps.length - 1, Math.floor(progress / 25));

  return (
    <ClayCard className="border-violet-200 bg-violet-50/80">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <StatusPill>Scan in progress</StatusPill>
          <h2 className="mt-4 text-2xl font-semibold leading-tight text-slate-950">Preparing your AI Visibility Audit</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Reviewing page structure, answer coverage, entity clarity, and report readiness.</p>
        </div>
        <div className="text-5xl font-semibold leading-none text-violet-700">{progress}%</div>
      </div>
      <div className="mt-6 h-3 rounded-full bg-white">
        <div className="h-3 rounded-full bg-gradient-to-r from-violet-700 via-teal-500 to-amber-300 transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        {scanSteps.map((step, index) => (
          <div key={step} className={`rounded-2xl border p-4 text-sm font-semibold leading-5 ${index <= activeStep ? "border-violet-200 bg-white text-slate-950" : "border-white/70 bg-white/50 text-slate-500"}`}>
            {step}
          </div>
        ))}
      </div>
    </ClayCard>
  );
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-200/70 via-teal-100/70 to-amber-100/70 blur-2xl" />
      <ClayCard className="relative overflow-hidden bg-white/90 p-5">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Audit snapshot</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">AI search readiness</h2>
          </div>
          <StatusPill tone="green">Free audit</StatusPill>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl bg-violet-50 p-4"><p className="text-xs font-semibold text-violet-700">AI Visibility</p><p className="mt-3 text-3xl font-semibold text-slate-950">64</p></div>
          <div className="rounded-2xl bg-teal-50 p-4"><p className="text-xs font-semibold text-teal-700">AEO</p><p className="mt-3 text-3xl font-semibold text-slate-950">58</p></div>
          <div className="rounded-2xl bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-800">GEO</p><p className="mt-3 text-3xl font-semibold text-slate-950">61</p></div>
        </div>
        <div className="mt-5 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between"><p className="text-sm font-semibold text-slate-950">Top visibility gaps</p><span className="text-xs font-semibold text-slate-500">3 shown</span></div>
          <div className="grid gap-2">
            {mockReport.topFindings.map((finding, index) => (
              <div key={finding} className="rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-600"><span className="font-semibold text-slate-950">{index + 1}.</span> {finding}</div>
            ))}
          </div>
        </div>
      </ClayCard>
    </div>
  );
}

function FeatureGlyph({ title }: { title: string }) {
  const label = title.includes("Score") ? "Score" : title.includes("Comparison") ? "Competitor" : title.includes("Advisor") ? "Advisor" : title.toLowerCase().includes("fixes") ? "Fixes" : title.toLowerCase().includes("notes") ? "Audit" : title.toLowerCase().includes("reports") ? "Reports" : "Audit";

  return (
    <div className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm">
      <span className="relative grid size-7 place-items-center rounded-xl bg-slate-950/5" aria-hidden="true">
        <span className="block size-3 rounded-full border-2 border-violet-700" />
        <span className="absolute bottom-1 right-1 block size-2 rounded-full bg-teal-500" />
      </span>
      <span className="text-xs font-semibold text-slate-600">{label}</span>
    </div>
  );
}

function ReportPreview({ url }: { url: string }) {
  return (
    <section id="report-preview" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Free report</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">AI Visibility Audit snapshot</h2>
          <p className="mt-2 text-sm text-slate-600">Website URL: {url || mockReport.websiteUrl}</p>
        </div>
        <Link href="/report" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:border-slate-950">
          Open full report preview
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ScoreRing label="AI Visibility Score" score={mockReport.scores.aiVisibility} tone="bg-violet-700" />
        <ScoreRing label="AEO Score" score={mockReport.scores.aeo} tone="bg-teal-500" />
        <ScoreRing label="GEO Score" score={mockReport.scores.geo} tone="bg-amber-400" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <ClayCard>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-950">Top 3 findings</h3>
            <StatusPill tone="green">Free</StatusPill>
          </div>
          <div className="mt-5 grid gap-3">
            {mockReport.topFindings.map((finding, index) => (
              <div key={finding} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="mr-2 font-semibold text-slate-950">{index + 1}.</span>{finding}
              </div>
            ))}
          </div>
        </ClayCard>
        <ClayCard>
          <h3 className="text-xl font-semibold text-slate-950">Free outputs</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {outputCards.map((item) => (
              <div key={item} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">{item}</div>
            ))}
          </div>
        </ClayCard>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {mockReport.lockedSections.slice(0, 4).map((section) => (
          <LockedPanel key={section} title={section} description="Available in the full report" />
        ))}
      </div>
    </section>
  );
}

export function HomeExperience() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [submittedUrl, setSubmittedUrl] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "complete">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (scanState !== "scanning") return;

    const timer = window.setInterval(() => {
      setProgress((current) => {
        const nextProgress = Math.min(100, current + 10);
        if (nextProgress === 100) {
          window.clearInterval(timer);
          window.setTimeout(() => setScanState("complete"), 450);
        }
        return nextProgress;
      });
    }, 260);

    return () => window.clearInterval(timer);
  }, [scanState]);

  function runAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUrl = normalizeWebsiteUrl(url);
    if (!normalizedUrl) {
      setUrlError(urlErrorMessage);
      setScanState("idle");
      setSubmittedUrl("");
      return;
    }

    setUrlError("");
    setUrl(normalizedUrl);
    setSubmittedUrl(normalizedUrl);
    setProgress(0);
    setScanState("scanning");
  }

  return (
    <main>
      <section id="audit" className="surface-grid relative overflow-hidden px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1fr_0.86fr] lg:items-center">
          <div>
            <h1 className="max-w-5xl text-5xl font-semibold leading-[1.02] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
              Find why AI search is ignoring your brand.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              QueryCite helps brands find why AI search is not citing or recommending them, then generates ready-to-use AEO/GEO fixes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {valueItems.map((item) => <StatusPill key={item} tone="slate">{item}</StatusPill>)}
            </div>
          </div>

          <div className="grid gap-5">
            <ClayCard className="bg-white/90">
              <h2 className="text-2xl font-semibold leading-tight text-slate-950">Run a free AI visibility audit</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Enter your website to start the free audit flow.</p>
              <form onSubmit={runAudit} className="mt-6 grid gap-3" noValidate>
                <label htmlFor="audit-url" className="text-sm font-semibold text-slate-700">Website URL</label>
                <input
                  id="audit-url"
                  type="text"
                  inputMode="url"
                  required
                  value={url}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    if (urlError) setUrlError("");
                  }}
                  placeholder="Enter your website URL, for example byldgroup.com"
                  aria-invalid={Boolean(urlError)}
                  aria-describedby={urlError ? "audit-url-error" : undefined}
                  className="min-h-14 rounded-2xl border border-slate-200 bg-white px-5 text-base outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100"
                />
                {urlError ? <p id="audit-url-error" className="text-sm font-semibold leading-5 text-rose-600">{urlError}</p> : null}
                <button type="submit" className="min-h-14 rounded-2xl bg-slate-950 px-6 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800">
                  Run Free AI Visibility Audit
                </button>
              </form>
            </ClayCard>
            <HeroPreview />
          </div>
        </div>
      </section>

      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 rounded-3xl border border-white/70 bg-white/78 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4">
          {valueItems.map((item) => <div key={item} className="rounded-2xl bg-white p-4 text-center text-sm font-semibold text-slate-700">{item}</div>)}
        </div>
      </section>

      {scanState === "scanning" ? <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8"><ScanState progress={progress} /></section> : null}
      {scanState === "complete" ? <ReportPreview url={submittedUrl} /> : null}

      <section id="product" className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="The problem" title="Brands are invisible when AI cannot confidently cite them" description="AI search needs clear entities, answer-ready content, proof, structured data, and focused fixes. QueryCite turns those gaps into a practical report." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-3">
          {problemCards.map(([title, description]) => (
            <ClayCard key={title}>
              <h3 className="text-xl font-semibold leading-7 text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </ClayCard>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="The solution" title="AI Visibility Audit plus AEO/GEO Fix Generator" description="QueryCite shows where AI search readiness breaks down and prepares practical fixes your content, SEO, and web teams can review." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featureCards.map(([title, description]) => (
            <ClayCard key={title} className="transition hover:-translate-y-1">
              <FeatureGlyph title={title} />
              <h3 className="mt-5 text-xl font-semibold leading-7 text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </ClayCard>
          ))}
        </div>
      </section>

      <section id="how-it-works" className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="How it works" title="From URL to report preview" description="Enter a URL, review the scan progress, then see scores, findings, and full-report preview sections." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-4">
          {[
            ["Enter website URL", "Add your website domain or full URL to start the audit flow."],
            ["Scan AI visibility signals", "Review answer readiness, entity clarity, proof, schema, and report signals."],
            ["Get report and fixes", "See scores, findings, and recommended next actions in a clean report."],
            ["Unlock full report", "Preview deeper findings, competitor gaps, advisor notes, and exports."],
          ].map(([step, description], index) => (
            <ClayCard key={step}>
              <div className="text-4xl font-semibold leading-none text-violet-700">0{index + 1}</div>
              <h3 className="mt-4 text-lg font-semibold leading-7 text-slate-950">{step}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
            </ClayCard>
          ))}
        </div>
      </section>

      <section id="use-cases" className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="Use cases" title="Built for teams responsible for AI search readiness" description="QueryCite is designed for practical brand, content, SEO, and agency workflows without promising citations or rankings." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {useCases.map(([title, description]) => (
            <ClayCard key={title}>
              <h3 className="text-xl font-semibold leading-7 text-slate-950">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
            </ClayCard>
          ))}
        </div>
        <div className="mt-8 text-center"><PrimaryLink href="/use-cases">View all use cases</PrimaryLink></div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Pricing</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950">Start with a free audit. Unlock the full fix plan when you’re ready.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">QueryCite shows your AI visibility gaps for free, then unlocks the complete AEO/GEO action plan, AI Advisor, competitor comparison, and export-ready reports in paid plans.</p>
            <div className="mt-6"><PrimaryLink href="/pricing">View pricing</PrimaryLink></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <ClayCard><StatusPill tone="green">Free Audit</StatusPill><h3 className="mt-4 text-xl font-semibold leading-7">$0</h3></ClayCard>
            <ClayCard><StatusPill>Launch Trial</StatusPill><h3 className="mt-4 text-xl font-semibold leading-7">$10 first month, then $29/month</h3></ClayCard>
            <ClayCard><StatusPill tone="amber">Agency</StatusPill><h3 className="mt-4 text-xl font-semibold leading-7">From $149/month</h3></ClayCard>
          </div>
        </div>
      </section>

      <section id="integrations" className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="Integration status" title="Clear status labels, no unsupported claims" description="Integration availability is grouped as Live Now, Beta Testing, and Coming Soon so teams can understand what is available today." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 md:grid-cols-3">
          {Object.entries({ "Live Now": integrations.liveNow, "Beta Testing": integrations.betaTesting, "Coming Soon": integrations.comingSoon }).map(([group, items]) => (
            <ClayCard key={group}>
              <h3 className="text-xl font-semibold leading-7 text-slate-950">{group}</h3>
              <div className="mt-5 grid gap-3">
                {items.map((item) => <div key={item} className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold leading-5 text-slate-700">{item}</div>)}
              </div>
            </ClayCard>
          ))}
        </div>
      </section>

      <section id="faq" className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="FAQ" title="Buyer questions, answered clearly" description="No guaranteed outcomes, no vague claims, and no hidden live integrations." />
        <div className="mx-auto mt-10 grid max-w-4xl gap-4">
          {faqs.map(([question, answer]) => (
            <ClayCard key={question}>
              <h3 className="text-lg font-semibold leading-7 text-slate-950">{question}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{answer}</p>
            </ClayCard>
          ))}
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-7xl rounded-[2rem] bg-gradient-to-r from-slate-950 via-violet-950 to-teal-900 p-8 text-center text-white shadow-2xl shadow-slate-950/20 sm:p-12">
          <h2 className="text-4xl font-semibold leading-tight">Run a free AI visibility audit</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-violet-100">See how QueryCite frames scores, findings, locked sections, and ready-to-use AEO/GEO fixes.</p>
          <div className="mt-8"><Link href="/#audit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-sm font-semibold text-slate-950">Start free audit</Link></div>
        </div>
      </section>
    </main>
  );
}

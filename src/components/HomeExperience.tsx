"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { faqs, integrations, useCases } from "@/lib/mock";
import { auditStorageKey, type AuditApiResponse, type WebsiteAuditReport } from "@/lib/audit-report";
import { normalizeWebsiteUrl, urlErrorMessage } from "@/lib/url";
import { DoodleConnector, FeatureClusterVisual, WorkflowDoodle } from "@/components/DoodleVisuals";
import { ClayCard, LockedPanel, PrimaryLink, ScoreRing, SectionHeader, StatusPill } from "@/components/ui";

const scanSteps = ["Scanning website", "Checking AI visibility signals", "Reviewing brand and content gaps", "Preparing report"];
const valueItems = ["Brand clarity", "Content gaps", "Trust signals", "Ready-to-use fixes", "Advisor guidance"];
const problemCards = [
  ["AI search cannot explain you clearly", "Weak entity signals make it harder for AI systems to identify what your brand does and who it serves."],
  ["Pages are not answer-ready", "Useful content often lacks concise answers, FAQs, proof points, and structure that AI can summarize."],
  ["Competitors may look more citeable", "Brands with clearer positioning, schema, trust signals, and content coverage can appear easier to recommend."],
];
const outputCards = ["Limited branded PDF preview", "CSV findings download", "Share report preview", "Email report preview"];

type FeatureClusterKind = "audit" | "insight" | "intelligence" | "output";

const featureClusters: Array<{
  kind: FeatureClusterKind;
  eyebrow: string;
  title: string;
  summary: string;
  bullets: string[];
  wide: boolean;
  className: string;
}> = [
  {
    kind: "audit",
    eyebrow: "Audit & Scores",
    title: "See the signals AI systems can read",
    summary: "One scan turns technical and content signals into a clear readiness baseline.",
    bullets: ["AI Visibility, AEO, and GEO scores", "Crawler and access checks"],
    wide: true,
    className: "border-violet-200 bg-violet-50/70",
  },
  {
    kind: "insight",
    eyebrow: "Insight & Recommendations",
    title: "Move from issue to implementation",
    summary: "Each gap is translated into a practical action for the team that owns it.",
    bullets: ["llms.txt and content guidance", "Ready-to-paste fixes and developer notes"],
    wide: false,
    className: "border-amber-200 bg-amber-50/70",
  },
  {
    kind: "intelligence",
    eyebrow: "Intelligence & Comparison",
    title: "Understand the gap, then ask what to do",
    summary: "Compare readiness signals and use report-grounded guidance to prioritize the work.",
    bullets: ["Competitor comparison", "AI Visibility Advisor"],
    wide: false,
    className: "border-cyan-200 bg-cyan-50/70",
  },
  {
    kind: "output",
    eyebrow: "Output & Sharing",
    title: "Hand the plan to the people doing the work",
    summary: "Package the audit into useful formats for review, implementation, and follow-up.",
    bullets: ["PDF and CSV reports", "Share and email report workflows"],
    wide: true,
    className: "border-emerald-200 bg-emerald-50/70",
  },
];

const leadSubmittedKey = "querycite_lead_submitted";
const leadEmailKey = "querycite_lead_email";

function hasSubmittedLeadThisSession() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(leadSubmittedKey) === "true";
  } catch {
    return false;
  }
}

function markLeadSubmitted(email: string) {
  try {
    window.sessionStorage.setItem(leadSubmittedKey, "true");
    window.sessionStorage.setItem(leadEmailKey, email);
  } catch {
    // Session storage is only a convenience flag and is not used for paid access.
  }
}

function storeReportForReportPage(report: WebsiteAuditReport) {
  window.localStorage.setItem(auditStorageKey, JSON.stringify(report));
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function LeadCaptureModal({ report, onSuccess }: { report: WebsiteAuditReport; onSuccess: (email: string) => void }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [role, setRole] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submitLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim().toLowerCase();

    if (!trimmedName) {
      setError("Please enter your full name.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setError("Please enter a valid email.");
      return;
    }

    if (!privacyAccepted) {
      setError("Please accept the Privacy Policy and Terms of Use to view your report.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const params = new URLSearchParams(window.location.search);
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: trimmedName,
          email: trimmedEmail,
          companyName,
          role,
          websiteUrl: report.finalUrl,
          auditUrl: report.websiteUrl,
          reportId: report.reportId ?? "",
          source: "free_audit_gate",
          utmSource: params.get("utm_source") ?? "",
          utmMedium: params.get("utm_medium") ?? "",
          utmCampaign: params.get("utm_campaign") ?? "",
          privacyTermsAccepted: privacyAccepted,
          marketingConsent,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "We could not save your details right now. Please try again or contact hello@querycite.com.");
      }

      onSuccess(trimmedEmail);
    } catch (leadError) {
      setError(leadError instanceof Error ? leadError.message : "We could not save your details right now. Please try again or contact hello@querycite.com.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4 py-8 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/80 bg-white p-6 shadow-2xl shadow-slate-950/25 sm:p-8">
        <StatusPill tone="violet">Free report access</StatusPill>
        <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-950">Get your free AI Visibility Report</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">Enter your details to view your website-based AI visibility report. We will use your information to share your report and relevant QueryCite updates.</p>
        <p className="mt-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-600">Scanned website: {report.finalUrl}</p>

        <form onSubmit={submitLead} className="mt-6 grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Full name
              <input value={fullName} onChange={(event) => setFullName(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Email
              <input value={email} onChange={(event) => setEmail(event.target.value)} inputMode="email" className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Company name <span className="font-medium text-slate-400">optional</span>
              <input value={companyName} onChange={(event) => setCompanyName(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-slate-700">
              Role <span className="font-medium text-slate-400">optional</span>
              <input value={role} onChange={(event) => setRole(event.target.value)} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm outline-none transition focus:border-violet-500 focus:ring-4 focus:ring-violet-100" />
            </label>
          </div>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">
            <input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} className="mt-1 size-4 rounded border-slate-300" />
            <span>I agree to the <Link href="/privacy-policy" className="text-violet-700 underline">Privacy Policy</Link> and <Link href="/terms" className="text-violet-700 underline">Terms of Use</Link>.</span>
          </label>

          <label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold leading-6 text-slate-700">
            <input type="checkbox" checked={marketingConsent} onChange={(event) => setMarketingConsent(event.target.checked)} className="mt-1 size-4 rounded border-slate-300" />
            <span>Send me QueryCite product updates and audit insights. <span className="block text-xs font-medium text-slate-500">You can opt out anytime.</span></span>
          </label>

          {error ? <p className="rounded-2xl border border-rose-100 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p> : null}

          <button type="submit" disabled={isSubmitting} className="min-h-12 rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-400">
            {isSubmitting ? "Saving details..." : "View My Free Report"}
          </button>
        </form>
      </div>
    </div>
  );
}
function ScanState({ progress }: { progress: number }) {
  const activeStep = Math.min(scanSteps.length - 1, Math.floor(progress / 25));

  return (
    <ClayCard className="border-violet-200 bg-violet-50/80">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <StatusPill>Scan in progress</StatusPill>
          <h2 className="mt-4 text-2xl font-semibold leading-tight text-slate-950">Preparing your AI visibility report</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">Checking your website, content, trust signals, and places where AI search may need clearer context.</p>
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
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Website scan</p>
            <h2 className="mt-1 text-lg font-semibold text-slate-950">What AI search can understand</h2>
          </div>
          <StatusPill tone="green">Real checks</StatusPill>
        </div>
        <div className="mt-5 grid gap-3">
          {["What your brand does", "Which pages explain your offer", "Where trust signals are unclear", "What to fix first"].map((item) => (
            <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">{item}</div>
          ))}
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

function FeatureClusterPanel({ cluster }: { cluster: (typeof featureClusters)[number] }) {
  return (
    <article className={`${cluster.wide ? "lg:col-span-7" : "lg:col-span-5"} self-start overflow-hidden rounded-[1.75rem] border p-5 shadow-sm ${cluster.className}`}>
      <div className={cluster.wide ? "grid gap-5 md:grid-cols-[0.92fr_1.08fr] md:items-center" : "grid gap-5"}>
        <FeatureClusterVisual kind={cluster.kind} />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{cluster.eyebrow}</p>
          <h3 className="mt-2 text-2xl font-semibold leading-tight text-slate-950">{cluster.title}</h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">{cluster.summary}</p>
          <div className="mt-4 grid gap-2">
            {cluster.bullets.map((bullet) => (
              <div key={bullet} className="flex items-center gap-3 text-sm font-semibold leading-5 text-slate-800">
                <span className="grid size-6 shrink-0 place-items-center rounded-full border border-slate-200 bg-white" aria-hidden="true"><span className="size-2 rounded-full bg-emerald-500" /></span>
                <span>{bullet}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
const explainerVideoPlaceholder = "QUERYCITE_EXPLAINER_VIDEO_URL";
const defaultExplainerVideoUrl = "/videos/querycite-explainer-motion.mp4";
const defaultExplainerThumbnailUrl = "/videos/querycite-explainer-thumbnail.png";

function getExplainerVideoUrl() {
  const value = process.env.NEXT_PUBLIC_EXPLAINER_VIDEO_URL?.trim();
  if (!value || value === explainerVideoPlaceholder) return defaultExplainerVideoUrl;

  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? value : defaultExplainerVideoUrl;
  } catch {
    return defaultExplainerVideoUrl;
  }
}

function getEmbeddedVideoUrl(videoUrl: string) {
  try {
    const url = new URL(videoUrl);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      const videoId = url.searchParams.get("v") || (url.pathname.startsWith("/shorts/") ? url.pathname.split("/")[2] : "");
      return videoId ? `https://www.youtube.com/embed/${videoId}` : "";
    }

    if (host === "vimeo.com") {
      const videoId = url.pathname.split("/").filter(Boolean)[0];
      return videoId ? `https://player.vimeo.com/video/${videoId}` : "";
    }
  } catch {
    return "";
  }

  return "";
}

function ExplainerVideoSection({ videoUrl, thumbnailUrl = defaultExplainerThumbnailUrl }: { videoUrl: string; thumbnailUrl?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [hasThumbnailError, setHasThumbnailError] = useState(false);
  const embedUrl = getEmbeddedVideoUrl(videoUrl);

  return (
    <section className="px-5 py-14 sm:px-8">
      <div className="theme-adaptive-soft mx-auto max-w-7xl overflow-hidden rounded-[2rem] border border-white/70 p-5 shadow-sm sm:p-7 lg:p-8">
        <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
          <div>
            <StatusPill tone="cyan">Product walkthrough</StatusPill>
            <h2 className="mt-4 text-3xl font-semibold leading-tight text-slate-950 sm:text-4xl">See QueryCite in 60 seconds</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">A quick walkthrough of how QueryCite scans your website, finds AI visibility gaps, and gives ready-to-use fixes.</p>
            <div className="mt-6 grid gap-3 text-sm font-semibold text-slate-700 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {['Scan website', 'Find gaps', 'Apply fixes'].map((item) => (
                <div key={item} className="qc-surface rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm">{item}</div>
              ))}
            </div>
          </div>

          <div className="qc-surface overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-3 shadow-[0_24px_70px_rgba(15,23,42,0.12)]">
            <div className="relative aspect-video overflow-hidden rounded-[1.35rem] bg-slate-950">
              {hasVideoError ? (
                <div className="absolute inset-0 grid place-items-center bg-slate-950 px-6 text-center text-white">
                  <div>
                    <p className="text-lg font-semibold">Video preview is unavailable right now.</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">You can still run a free audit and view the product walkthrough later.</p>
                  </div>
                </div>
              ) : isPlaying ? (
                embedUrl ? (
                  <iframe
                    title="QueryCite explainer video"
                    src={embedUrl}
                    className="absolute inset-0 size-full"
                    loading="lazy"
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                ) : (
                  <video
                    src={videoUrl}
                    poster={thumbnailUrl}
                    controls
                    playsInline
                    preload="metadata"
                    onError={() => setHasVideoError(true)}
                    className="absolute inset-0 size-full bg-slate-950 object-cover"
                  />
                )
              ) : (
                <button
                  type="button"
                  onClick={() => setIsPlaying(true)}
                  className="group absolute inset-0 grid size-full place-items-center overflow-hidden text-left focus:outline-none focus:ring-4 focus:ring-violet-200"
                  aria-label="Play QueryCite explainer video"
                >
                  {hasThumbnailError ? (
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,0.36),transparent_26%),radial-gradient(circle_at_82%_18%,rgba(6,182,212,0.28),transparent_30%),linear-gradient(135deg,#0f172a,#312e81_55%,#0f766e)]" />
                  ) : (
                    <img
                      src={thumbnailUrl}
                      alt=""
                      aria-hidden="true"
                      onError={() => setHasThumbnailError(true)}
                      className="absolute inset-0 size-full object-cover"
                    />
                  )}
                  <div className="absolute inset-0 bg-slate-950/30" />
                  <div className="relative grid w-full max-w-xl gap-4 px-5 sm:px-8">
                    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/20 bg-white/12 p-4 text-white shadow-2xl backdrop-blur">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-100">Website scan</p>
                        <p className="mt-1 text-2xl font-semibold leading-tight">URL to gaps to fixes</p>
                      </div>
                      <span className="grid size-14 shrink-0 place-items-center rounded-full bg-white text-slate-950 shadow-lg transition group-hover:scale-105" aria-hidden="true">
                        <span className="ml-1 block h-0 w-0 border-y-[9px] border-l-[14px] border-y-transparent border-l-slate-950" />
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-xs font-semibold text-white/90">
                      <span className="rounded-2xl border border-white/20 bg-white/12 p-3 backdrop-blur">Scan</span>
                      <span className="rounded-2xl border border-white/20 bg-white/12 p-3 backdrop-blur">Advisor</span>
                      <span className="rounded-2xl border border-white/20 bg-white/12 p-3 backdrop-blur">Fix pack</span>
                    </div>
                  </div>
                </button>
              )}
            </div>
            <p className="px-2 pt-3 text-xs font-semibold leading-5 text-slate-500">Click to play. Video loads only after interaction.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
function ReportPreview({ report }: { report: WebsiteAuditReport }) {
  return (
    <section id="report-preview" className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">Free report</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-slate-950">Website-based AI Visibility Audit</h2>
          <p className="mt-2 text-sm text-slate-600">Website URL: {report.finalUrl}</p>
        </div>
        <Link href="/report" className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-900 transition hover:border-slate-950">
          Open report
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <ScoreRing label="AI Visibility Score" score={report.scores.aiVisibility} tone="bg-violet-700" />
        <ScoreRing label="AEO Readiness Score" score={report.scores.aeoReadiness} tone="bg-teal-500" />
        <ScoreRing label="GEO Readiness Score" score={report.scores.geoReadiness} tone="bg-amber-400" />
        <ScoreRing label="AI Crawler Readiness Score" score={report.scores.aiCrawlerReadiness} tone="bg-cyan-500" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <ClayCard>
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-xl font-semibold text-slate-950">Top 3 findings</h3>
            <StatusPill tone="green">Free</StatusPill>
          </div>
          <div className="mt-5 grid gap-3">
            {report.findings.slice(0, 3).map((finding, index) => (
              <div key={finding.issue} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
                <span className="mr-2 font-semibold text-slate-950">{index + 1}.</span>{finding.issue}
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
        {["All findings", "AI Crawler Readiness details", "llms.txt generator", "AI Visibility Advisor", "Developer action notes", "PDF/share/email previews"].map((section) => (
          <LockedPanel key={section} title={section} description="Available in the full report" />
        ))}
      </div>
    </section>
  );
}

export function HomeExperience() {
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "complete">("idle");
  const [progress, setProgress] = useState(0);
  const [report, setReport] = useState<WebsiteAuditReport | null>(null);
  const [canShowReport, setCanShowReport] = useState(false);
  const [isLeadGateOpen, setIsLeadGateOpen] = useState(false);
  const explainerVideoUrl = getExplainerVideoUrl();

  useEffect(() => {
    if (scanState !== "scanning") return;

    const timer = window.setInterval(() => {
      setProgress((current) => Math.min(90, current + 7));
    }, 350);

    return () => window.clearInterval(timer);
  }, [scanState]);

  async function runAudit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedUrl = normalizeWebsiteUrl(url);
    if (!normalizedUrl) {
      setUrlError(urlErrorMessage);
      setScanState("idle");
      setReport(null);
      setCanShowReport(false);
      setIsLeadGateOpen(false);
      return;
    }

    setUrlError("");
    setUrl(normalizedUrl);
    setReport(null);
    setCanShowReport(false);
    setIsLeadGateOpen(false);
    setProgress(8);
    setScanState("scanning");

    try {
      const response = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = (await response.json()) as Partial<AuditApiResponse> & { error?: string };

      if (!response.ok || !data.report) {
        throw new Error(data.error || "The audit service is temporarily unavailable. Please try again.");
      }

      setReport(data.report);
      setProgress(100);
      setScanState("complete");

      if (hasSubmittedLeadThisSession()) {
        storeReportForReportPage(data.report);
        setCanShowReport(true);
      } else {
        setCanShowReport(false);
        setIsLeadGateOpen(true);
      }
    } catch (error) {
      setUrlError(error instanceof Error ? error.message : "The audit service is temporarily unavailable. Please try again.");
      setScanState("idle");
      setProgress(0);
      setCanShowReport(false);
      setIsLeadGateOpen(false);
    }
  }

  function handleLeadSuccess(email: string) {
    if (!report) return;
    markLeadSubmitted(email);
    storeReportForReportPage(report);
    setCanShowReport(true);
    setIsLeadGateOpen(false);
  }

  return (
    <main className="marketing-home-light">
      <section id="audit" className="surface-grid relative overflow-hidden px-5 py-16 sm:px-8 lg:py-20">
        <div className="mx-auto grid w-full max-w-7xl gap-12 lg:grid-cols-[1fr_0.86fr] lg:items-center">
          <div>
            <h1 className="max-w-5xl text-5xl font-semibold leading-[1.02] tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
              Your customers are asking AI. Is your brand showing up?
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700">
              QueryCite scans your website to find why AI search may not understand, cite, or recommend your brand &mdash; then gives you ready-to-use fixes.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/#audit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">Scan your website free</Link>
              <Link href="/#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-700 hover:text-blue-800">See how it works</Link>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              {valueItems.map((item) => <StatusPill key={item} tone="slate">{item}</StatusPill>)}
            </div>
            <p className="mt-5 max-w-2xl rounded-2xl border border-slate-200 bg-white/85 p-4 text-xs font-semibold leading-5 text-slate-600">QueryCite improves AI visibility readiness. It does not guarantee rankings, traffic, or AI citations.</p>
          </div>

          <div className="grid gap-5">
            <ClayCard className="bg-white/90">
              <h2 className="text-2xl font-semibold leading-tight text-slate-950">Run a free website scan</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Enter your website to see where AI search may need clearer signals about your brand.</p>
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
                <button type="submit" disabled={scanState === "scanning"} className="min-h-14 rounded-2xl bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400">
                  {scanState === "scanning" ? "Running scan..." : "Scan your website free"}
                </button>
              </form>
            </ClayCard>
            <HeroPreview />
          </div>
        </div>
      </section>

      <section className="px-5 pb-10 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-3 rounded-3xl border border-white/70 bg-white/78 p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-5">
          {valueItems.map((item, index) => (
            <div key={item} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <FeatureGlyph title={item} />
              <p className="mt-3 text-sm font-semibold text-slate-800">{item}</p>
              <div className="mt-3 h-1.5 rounded-full bg-slate-100" aria-hidden="true">
                <div className="h-1.5 rounded-full bg-violet-600" style={{ width: `${52 + index * 9}%` }} />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8">
        <div className="theme-adaptive-soft mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-white/70 p-6 shadow-sm lg:grid-cols-[0.95fr_1.05fr] lg:items-center lg:p-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Why QueryCite is different</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">QueryCite does not just tell you what is wrong. It shows what to fix and where to use it.</h2>
            <p className="mt-4 text-sm leading-6 text-slate-600">Turn unclear brand, content, and website signals into practical next steps your marketing and technical teams can use.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Plain-English gaps", "Copy-paste recommendations", "Developer notes", "Content ideas"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/70 bg-white p-4 text-sm font-semibold text-slate-700 shadow-sm">{item}</div>
            ))}
          </div>
        </div>
      </section>

      {explainerVideoUrl ? <ExplainerVideoSection videoUrl={explainerVideoUrl} /> : null}

      {scanState === "scanning" ? <section className="mx-auto w-full max-w-7xl px-5 py-10 sm:px-8"><ScanState progress={progress} /></section> : null}
      {isLeadGateOpen && report ? <LeadCaptureModal report={report} onSuccess={handleLeadSuccess} /> : null}
      {scanState === "complete" && report && canShowReport ? <ReportPreview report={report} /> : null}

      <section id="product" className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="The problem" title="Brands are invisible when AI cannot explain them clearly" description="If your website does not clearly explain who you help, what you do, and why you are credible, AI search may miss important context." />
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
        <SectionHeader eyebrow="What you get" title="One audit, four connected layers" description="A simple view of the gaps, the recommendations, and the outputs your team can use." />
        <div className="mx-auto mt-10 grid max-w-7xl gap-5 lg:grid-cols-12">
          {featureClusters.map((cluster) => <FeatureClusterPanel key={cluster.kind} cluster={cluster} />)}
        </div>
        <p className="mx-auto mt-6 max-w-4xl rounded-3xl border border-slate-200 bg-white/85 p-5 text-center text-sm font-semibold leading-6 text-slate-700 shadow-sm">
          For teams that already know the terms, QueryCite also checks AEO, GEO, schema, crawler readiness, and llms.txt signals.
        </p>
      </section>

      <section id="how-it-works" className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="How QueryCite helps" title="From website scan to clear next steps" description="A simple workflow for finding what AI search may be missing and turning it into useful fixes." />
        <div className="relative mx-auto mt-10 max-w-7xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-8 lg:px-10">
          <div className="absolute inset-0 opacity-45 surface-grid" aria-hidden="true" />
          <div className="relative grid items-center gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
            <div className="text-center">
              <div className="mx-auto max-w-xs rounded-[1.5rem] border border-violet-200 bg-violet-50 p-3 shadow-sm">
                <WorkflowDoodle kind="url" />
              </div>
              <div className="mx-auto mt-5 grid size-8 place-items-center rounded-full bg-violet-700 text-xs font-semibold text-white">01</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">Scan your website</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">Enter your website URL and get a quick AI visibility audit.</p>
            </div>

            <div className="grid place-items-center">
              <span className="hidden md:block"><DoodleConnector /></span>
              <span className="md:hidden"><DoodleConnector direction="vertical" /></span>
            </div>

            <div className="text-center">
              <div className="mx-auto max-w-xs rounded-[1.5rem] border border-cyan-200 bg-cyan-50 p-3 shadow-sm">
                <WorkflowDoodle kind="scan" />
              </div>
              <div className="mx-auto mt-5 grid size-8 place-items-center rounded-full bg-cyan-700 text-xs font-semibold text-white">02</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">Find what AI search may be missing</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">See where your brand, content, structure, and technical signals may be unclear.</p>
            </div>

            <div className="grid place-items-center">
              <span className="hidden md:block"><DoodleConnector /></span>
              <span className="md:hidden"><DoodleConnector direction="vertical" /></span>
            </div>

            <div className="text-center">
              <div className="mx-auto max-w-xs rounded-[1.5rem] border border-emerald-200 bg-emerald-50 p-3 shadow-sm">
                <WorkflowDoodle kind="fix" />
              </div>
              <div className="mx-auto mt-5 grid size-8 place-items-center rounded-full bg-emerald-700 text-xs font-semibold text-white">03</div>
              <h3 className="mt-3 text-xl font-semibold text-slate-950">Get ready-to-use fixes</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-slate-600">Use copy-paste recommendations, developer notes, and content ideas to improve your AI search readiness.</p>
            </div>
          </div>

          <div className="relative mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2 text-xs font-semibold text-slate-600">
            {['Website URL', 'Missing context', 'Fix plan', 'Retest'].map((label, index) => (
              <div key={label} className="flex items-center gap-2">
                {index > 0 ? <span className="text-slate-300" aria-hidden="true">&rarr;</span> : null}
                <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 shadow-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="use-cases" className="px-5 py-16 sm:px-8">
        <SectionHeader eyebrow="Built for" title="One report, clear owners" description="Practical workflows for brand, content, SEO, developer, and agency teams." />
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

      <section className="px-5 py-14 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:p-8">
          <div className="rounded-[1.5rem] border border-blue-100 bg-blue-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Founder-built</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950">Built for marketers who do not have a full SEO or development team.</h2>
          </div>
          <div>
            <p className="text-base leading-7 text-slate-700">QueryCite comes from 10+ years of hands-on marketing experience across digital campaigns, B2B growth, brand visibility, and performance marketing &mdash; built to make AI search readiness simple, practical, and fixable.</p>
            <p className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-700">Currently pursuing AGMP at IIM Ahmedabad.</p>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Pricing</p>
            <h2 className="mt-3 text-4xl font-semibold leading-tight text-slate-950">Start with a free audit. Unlock the full fix plan when you&apos;re ready.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">Free scores first. Full fixes, Advisor guidance, and exports when you need them.</p>
            <div className="mt-6"><PrimaryLink href="/pricing">View pricing</PrimaryLink></div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <ClayCard><StatusPill tone="green">Free</StatusPill><h3 className="mt-4 text-xl font-semibold leading-7">$0</h3><p className="mt-2 text-sm text-slate-600">Limited audit and report</p></ClayCard>
            <ClayCard><StatusPill>Starter</StatusPill><h3 className="mt-4 text-xl font-semibold leading-7">$20/month</h3><p className="mt-2 text-sm text-slate-600">For hands-on visibility fixes</p></ClayCard>
            <ClayCard><StatusPill tone="cyan">Pro</StatusPill><h3 className="mt-4 text-xl font-semibold leading-7">$99/month</h3><p className="mt-2 text-sm text-slate-600">For ongoing team workflows</p></ClayCard>
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
        <div className="mx-auto max-w-7xl rounded-[2rem] border border-blue-100 bg-gradient-to-r from-blue-50 via-white to-teal-50 p-8 text-center shadow-xl shadow-blue-950/5 sm:p-12">
          <h2 className="text-4xl font-semibold leading-tight text-slate-950">Scan your website free</h2>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600">Find what AI search may be missing and get clear, ready-to-use next steps.</p>
          <div className="mt-8"><Link href="/#audit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-blue-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:-translate-y-0.5 hover:bg-blue-700">Scan your website free</Link></div>
        </div>
      </section>
    </main>
  );
}

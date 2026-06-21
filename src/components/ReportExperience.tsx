"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AdvisorChat } from "@/components/AdvisorChat";
import { ClayCard, LockedPanel, ScoreRing, SectionHeader, StatusPill } from "@/components/ui";
import { auditStorageKey, isWebsiteAuditReport, type AuditFinding, type ScoreName, type WebsiteAuditReport } from "@/lib/audit-report";
import type { PaidPlanName } from "@/lib/plans";

type ReportExperienceProps = {
  isFullDemo: boolean;
  reportId?: string | null;
  subscriptionId?: string | null;
  hasVerifiedFullAccess?: boolean;
  paidPlanName?: PaidPlanName;
};

type ScoreCardConfig = readonly [label: string, key: ScoreName, value: number, tone: string];

const leadSubmittedKey = "querycite_lead_submitted";

function hasSubmittedLeadThisSession() {
  if (typeof window === "undefined") return false;
  try {
    return window.sessionStorage.getItem(leadSubmittedKey) === "true";
  } catch {
    return false;
  }
}

type CsvClassification = { scoreCategory: string; fixType: string; category: string };

type FixPackItem = {
  title: string;
  category: string;
  copy: string;
};

function csvEscape(value: string | number) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function classifyFinding(finding: AuditFinding): CsvClassification {
  const text = `${finding.issue} ${finding.whyItMatters} ${finding.recommendedFix}`.toLowerCase();

  if (/crawler|robots|gptbot|claude|perplexity|googlebot|bingbot|ccbot/.test(text)) {
    return { scoreCategory: "AI Crawler Readiness Score", fixType: "Crawler access review", category: "crawler" };
  }
  if (/llms\.txt|llms/.test(text)) {
    return { scoreCategory: "GEO Readiness Score", fixType: "llms.txt guidance", category: "llms" };
  }
  if (/schema|json-ld|structured data|organization|faqpage|article/.test(text)) {
    return { scoreCategory: "Structured Data Score", fixType: "Schema update", category: "schema" };
  }
  if (/meta|title|h1|canonical|open graph/.test(text)) {
    return { scoreCategory: "Content Readiness Score", fixType: "Metadata update", category: "metadata" };
  }
  if (/internal link|sitemap|technical|homepage template/.test(text)) {
    return { scoreCategory: "Technical Readiness Score", fixType: "Technical update", category: "technical" };
  }

  return { scoreCategory: "AEO/GEO Readiness Score", fixType: "Content improvement", category: "content" };
}

function findingToCsvRow(finding: AuditFinding) {
  const classification = classifyFinding(finding);
  return [
    classification.scoreCategory,
    finding.issue,
    finding.priority,
    finding.owner,
    finding.whyItMatters,
    finding.recommendedFix,
    classification.fixType,
    classification.category,
  ].map(csvEscape).join(",");
}

function downloadFindingsCsv(report: WebsiteAuditReport) {
  const header = ["Score category", "Issue", "Priority", "Owner", "Why it matters", "Recommended fix", "Fix type", "Category"].join(",");
  const rows = report.findings.map(findingToCsvRow).join("\n");
  const csv = `${header}\n${rows}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const hostname = new URL(report.finalUrl).hostname.replace(/[^a-z0-9.-]/gi, "-");
  link.href = url;
  link.download = `querycite-${hostname}-findings.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function pdfSafeText(value: string) {
  return value
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/\s+/g, " ")
    .trim();
}

function wrapPdfLine(value: string, width = 92) {
  const words = pdfSafeText(value).split(" ").filter(Boolean);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > width && current) {
      lines.push(current);
      current = word;
    } else {
      current = next;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [""];
}

function createPdfBlob(lines: string[]) {
  const pageCapacity = 45;
  const pages = Array.from({ length: Math.max(1, Math.ceil(lines.length / pageCapacity)) }, (_, index) => lines.slice(index * pageCapacity, (index + 1) * pageCapacity));
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>"];
  const pageRefs: string[] = [];
  const fontObjectNumber = 3 + pages.length * 2;

  objects.push("");

  pages.forEach((pageLines, index) => {
    const pageObjectNumber = 3 + index * 2;
    const contentObjectNumber = pageObjectNumber + 1;
    pageRefs.push(`${pageObjectNumber} 0 R`);
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObjectNumber} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`);
    const stream = [`BT`, `/F1 10 Tf`, `50 742 Td`, `14 TL`, ...pageLines.map((line) => `(${pdfSafeText(line)}) Tj T*`), `ET`].join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${pages.length} >>`;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.slice(1).forEach((offset) => {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Blob([pdf], { type: "application/pdf" });
}

function reportPdfLines(report: WebsiteAuditReport, fullAccess?: boolean) {
  const mode = fullAccess ? "Full AI Visibility Report" : "Limited Free AI Visibility Report";
  const lines = [
    "QueryCite",
    mode,
    `Website: ${report.finalUrl}`,
    `Scanned: ${new Date(report.scannedAt).toLocaleString()}`,
    "",
    "Scores",
    `AI Visibility Score: ${report.scores.aiVisibility}/100`,
    `AEO Readiness Score: ${report.scores.aeoReadiness}/100`,
    `GEO Readiness Score: ${report.scores.geoReadiness}/100`,
    `AI Crawler Readiness Score: ${report.scores.aiCrawlerReadiness}/100`,
    "",
    fullAccess ? "Findings" : "Top 3 Findings",
  ];

  const findings = fullAccess ? report.findings : report.findings.slice(0, 3);
  findings.forEach((finding, index) => {
    lines.push(`${index + 1}. ${finding.issue}`);
    lines.push(`Priority: ${finding.priority} | Owner: ${finding.owner}`);
    lines.push(`Why it matters: ${finding.whyItMatters}`);
    lines.push(`Recommended fix: ${finding.recommendedFix}`);
    lines.push("");
  });

  if (fullAccess) {
    lines.push("Developer Notes");
    report.developerNotes.forEach((note) => lines.push(`- ${note}`));
    lines.push("");
    lines.push("Recommendations");
    report.fullRecommendations.forEach((recommendation) => lines.push(`- ${recommendation}`));
  } else {
    lines.push("Unlock the full report for all findings, developer notes, competitor comparison, AI Advisor, ready-to-paste fixes, and full export options.");
  }

  lines.push("");
  lines.push("QueryCite does not guarantee AI citations, rankings, traffic, or revenue.");
  return lines.flatMap((line) => wrapPdfLine(line));
}

function downloadReportPdf(report: WebsiteAuditReport, fullAccess?: boolean) {
  const blob = createPdfBlob(reportPdfLines(report, fullAccess));
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const hostname = new URL(report.finalUrl).hostname.replace(/[^a-z0-9.-]/gi, "-");
  link.href = url;
  link.download = fullAccess ? `querycite-${hostname}-full-report.pdf` : `querycite-${hostname}-free-report.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
function scoreCards(report: WebsiteAuditReport): ScoreCardConfig[] {
  return [
    ["AI Visibility Score", "aiVisibility", report.scores.aiVisibility, "bg-violet-600"],
    ["AEO Readiness Score", "aeoReadiness", report.scores.aeoReadiness, "bg-fuchsia-500"],
    ["GEO Readiness Score", "geoReadiness", report.scores.geoReadiness, "bg-emerald-500"],
    ["AI Crawler Readiness Score", "aiCrawlerReadiness", report.scores.aiCrawlerReadiness, "bg-cyan-500"],
    ["Citation Readiness Score", "citationReadiness", report.scores.citationReadiness, "bg-teal-500"],
    ["Content Readiness Score", "contentReadiness", report.scores.contentReadiness, "bg-amber-400"],
    ["Technical Readiness Score", "technicalReadiness", report.scores.technicalReadiness, "bg-slate-700"],
  ];
}


function getHostname(report: WebsiteAuditReport) {
  try {
    return new URL(report.finalUrl).hostname.replace(/^www\./, "");
  } catch {
    return "example.com";
  }
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <button type="button" onClick={copyText} className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-800 transition hover:border-slate-950">
      {copied ? "Copied" : label}
    </button>
  );
}
function BetaBanner() {
  return (
    <div className="mb-8 rounded-3xl border border-violet-200 bg-gradient-to-r from-violet-50 via-white to-teal-50 p-5 shadow-sm">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-violet-700">Beta Preview Mode</p>
          <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-slate-800">
            Full report sections are temporarily unlocked for private feedback. Scores, recommendations, and workflows are being validated before paid launch.
          </p>
        </div>
        <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full bg-slate-950 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800">
          Share Feedback
        </Link>
      </div>
    </div>
  );
}

function FindingCard({ finding, index }: { finding: AuditFinding; index: number }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-slate-950">{index + 1}.</span>
        <StatusPill tone={finding.priority === "High" ? "amber" : "slate"}>{finding.priority}</StatusPill>
        <StatusPill tone="slate">{finding.owner}</StatusPill>
      </div>
      <h3 className="mt-3 text-base font-semibold leading-6 text-slate-950">{finding.issue}</h3>
      <p className="mt-2">{finding.whyItMatters}</p>
      <p className="mt-2 font-semibold text-slate-900">Fix: {finding.recommendedFix}</p>
    </div>
  );
}

function ReportDownloadButtons({ report, fullAccess, className = "" }: { report: WebsiteAuditReport; fullAccess?: boolean; className?: string }) {
  return (
    <div className={`grid gap-3 ${className}`}>
      <button type="button" onClick={() => downloadReportPdf(report, fullAccess)} className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-left text-sm font-semibold text-violet-900 transition hover:border-violet-300 hover:bg-violet-100">
        {fullAccess ? "Download full PDF report" : "Download limited free PDF"}
      </button>
      <button type="button" onClick={() => downloadFindingsCsv(report)} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-left text-sm font-semibold text-emerald-800 transition hover:border-emerald-300 hover:bg-emerald-100">
        {fullAccess ? "Download full CSV findings" : "Download basic CSV findings"}
      </button>
    </div>
  );
}

function ReportActions({ report, fullAccess }: { report: WebsiteAuditReport; fullAccess?: boolean }) {
  return (
    <ClayCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">Report actions</h3>
        <StatusPill tone="green">PDF/CSV works</StatusPill>
      </div>
      <ReportDownloadButtons report={report} fullAccess={fullAccess} className="mt-5" />
      <div className="mt-3 grid gap-3">
        {[
          ["Shareable report link", "Coming soon"],
          ["Email report workflow", "Coming soon"],
        ].map(([label, status]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            <span>{label}</span>
            <span>{status}</span>
          </div>
        ))}
      </div>
    </ClayCard>
  );
}
function SignalChecks({ report }: { report: WebsiteAuditReport }) {
  return (
    <ClayCard>
      <h3 className="text-xl font-semibold text-slate-950">Website signals checked</h3>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {Object.entries(report.checks).map(([key, check]) => (
          <div key={key} className={`rounded-2xl border p-4 text-sm leading-6 ${check.passed ? "border-emerald-100 bg-emerald-50 text-emerald-900" : "border-amber-100 bg-amber-50 text-amber-900"}`}>
            <p className="font-semibold">{check.label}</p>
            <p className="mt-1">{check.detail}</p>
          </div>
        ))}
      </div>
    </ClayCard>
  );
}

function ScoreExplanationGrid({ report }: { report: WebsiteAuditReport }) {
  return (
    <ClayCard>
      <h3 className="text-xl font-semibold text-slate-950">Why the scores look this way</h3>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {scoreCards(report).map(([label, key]) => {
          const explanation = report.scoreExplanations?.[key];
          return (
            <div key={key} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
              <h4 className="font-semibold text-slate-950">{label}</h4>
              <p className="mt-2 font-semibold text-emerald-800">Helped: {(explanation?.helped ?? ["Real website signals were checked."]).join(", ")}</p>
              <p className="mt-2 font-semibold text-amber-800">Hurt: {(explanation?.hurt ?? ["See findings below."]).join(", ")}</p>
              <p className="mt-2 text-slate-700">Fix first: {(explanation?.fixFirst ?? report.findings.slice(0, 1).map((finding) => finding.recommendedFix)).join(" ")}</p>
            </div>
          );
        })}
      </div>
    </ClayCard>
  );
}

function CrawlerReadinessDetails({ report }: { report: WebsiteAuditReport }) {
  const statusClass = {
    Allowed: "border-emerald-100 bg-emerald-50 text-emerald-800",
    Blocked: "border-rose-100 bg-rose-50 text-rose-800",
    "Not mentioned": "border-slate-100 bg-slate-50 text-slate-700",
    "Needs review": "border-amber-100 bg-amber-50 text-amber-800",
  } as const;

  return (
    <ClayCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">AI Crawler Readiness</h3>
        <StatusPill tone={report.crawlerReadiness.robotsFound ? "green" : "amber"}>{report.crawlerReadiness.score}/100</StatusPill>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">Checks robots.txt guidance for AI and search crawlers. Missing robots.txt is a warning, not an automatic failure, and this does not guarantee AI citation or inclusion.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-950">robots.txt</p>
          <p className="mt-1">{report.crawlerReadiness.robotsFound ? `Found with status ${report.crawlerReadiness.robotsStatusCode}` : "Not found or could not be fetched"}</p>
          <p className="mt-1 break-all text-xs text-slate-500">{report.crawlerReadiness.robotsTxtUrl}</p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
          <p className="font-semibold text-slate-950">What affects the score</p>
          <p className="mt-1">Blocked important crawlers reduce the score. Not mentioned or partial rules are flagged for review instead of treated as automatic failure.</p>
        </div>
      </div>
      <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
        <div className="grid gap-3 bg-slate-950 px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-white sm:grid-cols-[1fr_0.8fr_1.4fr]">
          <span>Crawler</span>
          <span>Status</span>
          <span>Details</span>
        </div>
        {report.crawlerReadiness.botResults.map((result) => (
          <div key={result.bot} className="grid gap-3 border-t border-slate-100 bg-white px-4 py-3 text-sm leading-6 text-slate-700 sm:grid-cols-[1fr_0.8fr_1.4fr]">
            <span className="font-semibold text-slate-950">{result.bot}</span>
            <span className={`inline-flex w-fit rounded-full border px-3 py-1 text-xs font-semibold ${statusClass[result.status]}`}>{result.status}</span>
            <span>{result.detail}</span>
          </div>
        ))}
      </div>
    </ClayCard>
  );
}

function LlmsTxtDetails({ report }: { report: WebsiteAuditReport }) {
  return (
    <ClayCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">llms.txt checker</h3>
        <StatusPill tone={report.llmsTxt.found ? "green" : "amber"}>{report.llmsTxt.found ? "Found" : "Missing"}</StatusPill>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">llms.txt can give AI systems and agents a curated map of important public pages. It supports GEO and technical readiness, but it does not replace schema, sitemap, or useful page content.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {[
          ["Status", report.llmsTxt.statusCode ? String(report.llmsTxt.statusCode) : "Not fetched"],
          ["Content length", `${report.llmsTxt.contentLength} characters`],
          ["Useful references", report.llmsTxt.hasUsefulReferences ? "Detected" : "Not detected"],
          ["Thin content", report.llmsTxt.isEmptyOrThin ? "Needs improvement" : "Looks substantial"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm leading-6 text-slate-700">
            <p className="font-semibold text-slate-950">{label}</p>
            <p className="mt-1">{value}</p>
          </div>
        ))}
      </div>
      <p className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">{report.llmsTxt.detail}</p>
    </ClayCard>
  );
}

function generateLlmsTxtDraft(report: WebsiteAuditReport) {
  const hostname = getHostname(report);
  const pages = [
    ["Homepage", report.discoveredPages.homepage],
    ["About", report.discoveredPages.aboutUrl],
    ["Contact", report.discoveredPages.contactUrl],
    ["Resources", report.discoveredPages.resourcesUrl],
    ...report.discoveredPages.importantInternalLinks.slice(0, 6).map((url, index) => [`Important page ${index + 1}`, url] as [string, string]),
  ].filter(([, url]) => Boolean(url));

  return [`# ${hostname} llms.txt`, "", "> Draft generated from the QueryCite report. Replace bracketed placeholders with verified brand details before publishing.", "", "## Brand context", `- Name: [Official brand name for ${hostname}]`, "- Category: [Primary product, service, or business category]", "- Audience: [Primary buyer or user audience]", "- Primary outcome: [Verified outcome the brand helps customers achieve]", "", "## Important public pages", ...pages.map(([label, url]) => `- ${label}: ${url}`), "", "## Recommended guidance", "- Use the homepage for the primary positioning and category summary.", "- Use About and Contact pages for entity and trust context.", "- Use resource pages for educational AEO/GEO context.", "- Do not treat this file as proof of rankings, traffic, or guaranteed AI citations."].join("\n");
}

function LlmsTxtDraft({ report }: { report: WebsiteAuditReport }) {
  const draft = generateLlmsTxtDraft(report);

  return (
    <ClayCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">Suggested llms.txt draft</h3>
        <CopyButton text={draft} label="Copy draft" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">Developer note: publish this at <span className="font-semibold text-slate-950">/llms.txt</span> only after replacing placeholders and confirming the public page list.</p>
      <pre className="mt-5 max-h-96 overflow-auto rounded-2xl border border-slate-100 bg-slate-950 p-4 text-xs leading-6 text-slate-100">{draft}</pre>
    </ClayCard>
  );
}

function generateFixPack(report: WebsiteAuditReport): FixPackItem[] {
  const hostname = getHostname(report);
  const llmsDraft = generateLlmsTxtDraft(report);
  const organizationSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "[Official brand name]",
    url: report.finalUrl,
    logo: `https://${hostname}/[logo-path]`,
    sameAs: ["[LinkedIn URL]", "[X/Twitter URL]", "[YouTube URL]"],
    contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: "[support email]" }],
  }, null, 2);
  const faqSchema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "What does [brand name] do?", acceptedAnswer: { "@type": "Answer", text: "[Concise answer based on verified homepage copy.]" } },
      { "@type": "Question", name: "Who is [brand name] for?", acceptedAnswer: { "@type": "Answer", text: "[Describe the verified audience.]" } },
      { "@type": "Question", name: "How does [brand name] help customers?", acceptedAnswer: { "@type": "Answer", text: "[Describe the verified outcome.]" } },
    ],
  }, null, 2);

  return [
    { title: "Meta title", category: "Metadata", copy: "[Brand name] | [Primary category] for [primary audience]" },
    { title: "Meta description", category: "Metadata", copy: "[Brand name] helps [primary audience] [solve verified problem] with [product/service category]. Review and keep this between 70 and 180 characters." },
    { title: "Homepage hero rewrite", category: "Content", copy: "[Brand name] helps [primary audience] [achieve verified outcome]. Use [product/service] to [primary job-to-be-done] with clearer proof, answers, and next steps." },
    { title: "FAQ ideas", category: "AEO", copy: ["What does [brand name] do?", "Who is [brand name] for?", "How does [brand name] compare with alternatives?", "What proof or customer outcomes can buyers review?", "How do buyers get started?"].join("\n") },
    { title: "FAQ schema", category: "Schema", copy: faqSchema },
    { title: "Organization schema", category: "Schema", copy: organizationSchema },
    { title: "llms.txt draft", category: "llms.txt", copy: llmsDraft },
    { title: "Developer notes", category: "Technical", copy: report.developerNotes.join("\n") },
    { title: "Content notes", category: "Content", copy: report.findings.filter((finding) => finding.owner === "Content").map((finding) => `- ${finding.recommendedFix}`).join("\n") || "- Add concise answer blocks, buyer FAQs, proof sections, and resource links based on verified brand information." },
    { title: "Marketing notes", category: "Marketing", copy: report.findings.filter((finding) => finding.owner === "Marketing").map((finding) => `- ${finding.recommendedFix}`).join("\n") || "- Strengthen positioning, proof, audience clarity, testimonials, and case-study references without inventing claims." },
  ];
}

function ReadyToPasteFixPack({ report }: { report: WebsiteAuditReport }) {
  const fixes = generateFixPack(report);

  return (
    <ClayCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-950">Ready-to-Paste Fix Pack</h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">Ten report-based starter outputs for marketing, content, and developer teams. Review placeholders before publishing and do not invent claims.</p>
        </div>
        <StatusPill tone="violet">10 outputs</StatusPill>
      </div>
      <div className="mt-5 grid gap-3">
        {fixes.map((fix) => (
          <div key={fix.title} className="rounded-2xl border border-violet-100 bg-violet-50 p-4 text-sm leading-6 text-slate-700">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-950">{fix.title}</p>
                <p className="mt-1 text-xs font-semibold uppercase tracking-[0.14em] text-violet-700">{fix.category}</p>
              </div>
              <CopyButton text={fix.copy} />
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-2xl border border-violet-100 bg-white p-4 text-xs leading-6 text-slate-700">{fix.copy}</pre>
          </div>
        ))}
      </div>
    </ClayCard>
  );
}
function CompetitorSetupFoundation() {
  return (
    <ClayCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">Competitor setup</h3>
        <StatusPill tone="amber">Login required to save</StatusPill>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">Add competitors now for beta review. Saved competitor setup will be enabled after login is connected.</p>
      <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1">0/3 competitors added</span>
        <span className="rounded-full bg-slate-100 px-3 py-1">0/3 changes used this cycle</span>
      </div>
      <div className="mt-5 grid gap-3">
        {[1, 2, 3].map((slot) => (
          <div key={slot} className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 md:grid-cols-[1fr_1fr_0.8fr]">
            <input aria-label={`Competitor ${slot} name`} placeholder="Competitor name" className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none" />
            <input aria-label={`Competitor ${slot} website`} placeholder="Competitor website URL" className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none" />
            <select aria-label={`Competitor ${slot} type`} className="min-h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm outline-none">
              <option>Direct</option>
              <option>Indirect</option>
              <option>Aspirational</option>
            </select>
          </div>
        ))}
      </div>
      <button type="button" disabled className="mt-5 min-h-11 rounded-full bg-slate-300 px-5 text-sm font-semibold text-white">
        Save competitors after beta login is enabled
      </button>
      <p className="mt-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-xs font-semibold leading-5 text-amber-900">
        Competitor changes are expected to be limited to 3 per billing cycle once login and billing are active.
      </p>
    </ClayCard>
  );
}

function CompetitorComparisonPreview() {
  return (
    <ClayCard>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-slate-950">Competitor comparison beta preview</h3>
        <StatusPill tone="amber">Beta preview</StatusPill>
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-600">Competitor comparison beta preview. Add competitors now. Full crawling and scoring will be enabled after login and saved competitor setup.</p>
      <div className="mt-5 grid gap-3">
        {["Competitor AI Visibility Score", "AEO/GEO gap table", "Why AI may recommend them", "Fix priority by competitor gap"].map((item) => (
          <div key={item} className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm font-semibold text-slate-700">
            {item}: available after competitor audits are connected.
          </div>
        ))}
      </div>
    </ClayCard>
  );
}

function NoReportState() {
  return (
    <main className="px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-lg">
        <StatusPill tone="amber">No report loaded</StatusPill>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950">Run a website-based audit first</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">Enter a website URL on the homepage to generate a real AI visibility readiness report. The latest report will open here.</p>
        <div className="mt-7">
          <Link href="/#audit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white">Run Free Audit</Link>
        </div>
      </div>
    </main>
  );
}

function LeadRequiredState() {
  return (
    <main className="px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-lg">
        <StatusPill tone="amber">Lead details required</StatusPill>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950">Run a website audit first to generate a real report</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">The free report opens after the website audit completes and the report access form is submitted.</p>
        <div className="mt-7">
          <Link href="/#audit" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white">Run Free Audit</Link>
        </div>
      </div>
    </main>
  );
}
function SavedReportLoadingState() {
  return (
    <main className="px-5 py-14 sm:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/70 bg-white/85 p-8 text-center shadow-lg">
        <StatusPill tone="violet">Loading report</StatusPill>
        <h1 className="mt-4 text-4xl font-semibold text-slate-950">Opening your saved QueryCite report</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">Fetching the report linked from your email.</p>
      </div>
    </main>
  );
}
function subscribeToReportStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function subscribeToLeadStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getStoredReportSnapshot() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(auditStorageKey) ?? "";
}

function getServerReportSnapshot() {
  return "";
}

function getLeadSubmittedSnapshot() {
  return hasSubmittedLeadThisSession() ? "true" : "false";
}

function getServerLeadSubmittedSnapshot() {
  return "false";
}

function parseStoredReport(storedReport: string) {
  if (!storedReport) return null;

  try {
    const parsed: unknown = JSON.parse(storedReport);
    return isWebsiteAuditReport(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function ReportExperience({ isFullDemo, reportId, subscriptionId, hasVerifiedFullAccess = false, paidPlanName = "free" }: ReportExperienceProps) {
  const storedReport = useSyncExternalStore(subscribeToReportStorage, getStoredReportSnapshot, getServerReportSnapshot);
  const storedReportObject = useMemo(() => parseStoredReport(storedReport), [storedReport]);
  const leadSubmittedSnapshot = useSyncExternalStore(subscribeToLeadStorage, getLeadSubmittedSnapshot, getServerLeadSubmittedSnapshot);
  const [remoteReport, setRemoteReport] = useState<WebsiteAuditReport | null>(null);
  const [remoteStatus, setRemoteStatus] = useState<"idle" | "ready" | "error">("idle");
  const hasSavedReportLink = Boolean(reportId);
  const report = hasSavedReportLink ? remoteReport : storedReportObject;
  const topFindings = useMemo(() => report?.findings.slice(0, 3) ?? [], [report]);
  const topFixes = useMemo(() => report?.fixes.slice(0, 3) ?? [], [report]);
  const isPaidUser = hasVerifiedFullAccess;
  const hasFullAccess = isPaidUser || isFullDemo;
  const leadSubmitted = isFullDemo || hasSavedReportLink || leadSubmittedSnapshot === "true";

  useEffect(() => {
    if (!reportId) return;

    let isActive = true;

    fetch(`/api/reports/${encodeURIComponent(reportId)}${subscriptionId ? `?subscription_id=${encodeURIComponent(subscriptionId)}` : ""}`)
      .then(async (response) => {
        const data = (await response.json()) as { report?: unknown };
        if (!response.ok || !isWebsiteAuditReport(data.report)) {
          throw new Error("Saved report could not be loaded.");
        }
        if (!isActive) return;
        setRemoteReport(data.report);
        setRemoteStatus("ready");
        window.localStorage.setItem(auditStorageKey, JSON.stringify(data.report));
      })
      .catch(() => {
        if (!isActive) return;
        setRemoteStatus("error");
      });

    return () => {
      isActive = false;
    };
  }, [reportId, subscriptionId]);

  if (hasSavedReportLink && remoteStatus !== "ready" && remoteStatus !== "error") {
    return <SavedReportLoadingState />;
  }

  if (!report) {
    return <NoReportState />;
  }

  if (!hasFullAccess && !leadSubmitted) {
    return <LeadRequiredState />;
  }
  return (
    <main className="px-5 py-14 sm:px-8">
      <section className="mx-auto max-w-7xl">
        {isFullDemo ? <BetaBanner /> : null}

        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <StatusPill tone={hasFullAccess ? "violet" : "green"}>{isFullDemo ? "Beta full report preview" : hasFullAccess ? "Full report" : "Free report"}</StatusPill>
            <h1 className="mt-4 text-4xl font-semibold text-slate-950 sm:text-5xl">AI Visibility Audit Report</h1>
            <p className="mt-3 text-base text-slate-600">Website URL: {report.finalUrl}</p>
            <p className="mt-1 text-sm text-slate-500">Scanned: {new Date(report.scannedAt).toLocaleString()}</p>
          </div>
          <div className="rounded-3xl border border-white/70 bg-white/80 p-4 text-sm leading-6 text-slate-600 shadow-sm">
            Free checkers show your score. QueryCite turns the score into fixes across crawler access, llms.txt, schema, metadata, content, and technical signals.
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {scoreCards(report).map(([label, , value, tone]) => <ScoreRing key={label} label={label} score={value} tone={tone} />)}
        </div>
      </section>

      <section className="mx-auto mt-10 grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <ClayCard>
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-2xl font-semibold text-slate-950">Top 3 findings</h2>
            <StatusPill tone="green">Free</StatusPill>
          </div>
          <div className="mt-5 grid gap-3">
            {topFindings.map((finding, index) => <FindingCard key={finding.issue} finding={finding} index={index} />)}
          </div>
        </ClayCard>

        <ClayCard>
          <h2 className="text-2xl font-semibold text-slate-950">Top 3 fixes</h2>
          <div className="mt-5 grid gap-3">
            {topFixes.map((finding, index) => <FindingCard key={finding.recommendedFix} finding={finding} index={index} />)}
          </div>
          <ReportDownloadButtons report={report} fullAccess={hasFullAccess} className="mt-5" />
        </ClayCard>
      </section>

      <section className="mx-auto mt-12 max-w-7xl">
        <SectionHeader
          eyebrow="FULL REPORT PREVIEW"
          title="Unlock the complete AI Visibility Report"
          description="See the full set of findings, crawler details, llms.txt generator, schema and metadata fixes, developer notes, competitor gaps, AI Advisor, report history, CSV/PDF exports, and weekly tracking when available."
        />

        {hasFullAccess ? (
          <div className="mt-8 grid gap-6">
            <div className="rounded-3xl border border-teal-100 bg-teal-50 p-5 text-sm font-semibold leading-6 text-teal-900">
              This preview is designed to collect feedback on report usefulness, actionability, pricing, and workflow before paid launch.
            </div>
            <ScoreExplanationGrid report={report} />
            <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
              <CrawlerReadinessDetails report={report} />
              <LlmsTxtDetails report={report} />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
              <ClayCard>
                <h3 className="text-2xl font-semibold text-slate-950">All findings</h3>
                <div className="mt-5 grid gap-3">{report.findings.map((finding, index) => <FindingCard key={finding.issue} finding={finding} index={index} />)}</div>
              </ClayCard>
              <AdvisorChat currentReportData={report} planType={isFullDemo ? "betaFullReport" : paidPlanName} subscriptionId={subscriptionId} reportId={report.reportId ?? reportId} resetDate={null} />
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <CompetitorSetupFoundation />
              <CompetitorComparisonPreview />
            </div>
            <div className="grid gap-6 lg:grid-cols-[1fr_0.85fr]">
              <div className="grid gap-6">
                <SignalChecks report={report} />
                <ReadyToPasteFixPack report={report} />
              </div>
              <div className="grid gap-6">
                <ClayCard>
                  <h3 className="text-xl font-semibold text-slate-950">Developer notes</h3>
                  <div className="mt-5 grid gap-3">
                    {report.developerNotes.map((note) => <div key={note} className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-slate-700">{note}</div>)}
                  </div>
                </ClayCard>
                <LlmsTxtDraft report={report} />
                <ReportActions report={report} fullAccess />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="mt-8 rounded-3xl border border-violet-100 bg-violet-50 p-5 text-sm font-semibold leading-6 text-violet-900">
              Free checkers show your score. QueryCite turns the score into fixes with crawler details, llms.txt guidance, schema and metadata updates, developer notes, competitor gaps, Advisor support, exports, and report history.
            </div>
            <div className="mt-8">
              <AdvisorChat currentReportData={report} planType="free" />
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["Full findings", "AI Crawler Readiness details", "llms.txt generator", "Schema and metadata fixes", "Developer notes", "Competitor gaps", "AI Visibility Advisor", "Report history", "CSV/PDF exports", "Weekly tracking later"].map((section) => (
                <LockedPanel key={section} title={section} description="Available in the full report" />
              ))}
            </div>
            <div className="mt-8 text-center">
              <Link href="/contact" className="inline-flex min-h-12 items-center justify-center rounded-full bg-slate-950 px-6 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:bg-slate-800">
                Join private beta
              </Link>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
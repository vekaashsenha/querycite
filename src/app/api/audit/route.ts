import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import type { AuditCheck, AuditFinding, FindingOwner, FindingPriority, ScoreName, WebsiteAuditReport } from "@/lib/audit-report";
import { normalizeWebsiteUrl } from "@/lib/url";

export const runtime = "nodejs";

type AuditRequest = {
  url?: string;
};

type SignalInput = {
  finalUrl: string;
  origin: string;
  fetchStatus: number;
  html: string;
  pageTitle: string;
  metaDescription: string;
  h1s: string[];
  h2s: string[];
  canonicalHref: string;
  ogTags: string[];
  schemaTypes: string[];
  internalLinks: string[];
  bodyText: string;
  robotsFound: boolean;
  sitemapFound: boolean;
  aboutFound: boolean;
  contactFound: boolean;
  blogFound: boolean;
};

type ScoreItem = {
  passed: boolean;
  weight: number;
};

const userAgent = "Mozilla/5.0 (compatible; QueryCiteBeta/1.0; +https://querycite.com)";
const timeoutMs = 12000;
const maxBodyChars = 30000;

function cleanText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function score(items: ScoreItem[]) {
  const possible = items.reduce((sum, item) => sum + item.weight, 0);
  const actual = items.reduce((sum, item) => sum + (item.passed ? item.weight : 0), 0);
  return clampScore((actual / possible) * 100);
}

function createCheck(label: string, passed: boolean, detail: string): AuditCheck {
  return { label, passed, detail };
}

function createFinding(issue: string, whyItMatters: string, priority: FindingPriority, recommendedFix: string, owner: FindingOwner): AuditFinding {
  return { issue, whyItMatters, priority, recommendedFix, owner };
}

async function fetchWithTimeout(url: string, init?: RequestInit) {
  return fetch(url, {
    ...init,
    headers: {
      "user-agent": userAgent,
      accept: "text/html,application/xhtml+xml,text/plain,*/*",
      ...(init?.headers ?? {}),
    },
    redirect: "follow",
    signal: AbortSignal.timeout(timeoutMs),
  });
}

async function fetchHomepage(url: string) {
  try {
    return await fetchWithTimeout(url);
  } catch (primaryError) {
    const fallbackUrl = new URL(url);
    if (fallbackUrl.protocol !== "https:") throw primaryError;

    fallbackUrl.protocol = "http:";
    return fetchWithTimeout(fallbackUrl.toString());
  }
}

async function exists(url: string) {
  try {
    const response = await fetchWithTimeout(url, { method: "GET" });
    return response.ok;
  } catch {
    return false;
  }
}

async function anyPageExists(urls: string[]) {
  const results = await Promise.all(urls.map((url) => exists(url)));
  return results.some(Boolean);
}

function extractSchemaTypes(schemaText: string[]) {
  const types = new Set<string>();

  function collectType(value: unknown) {
    if (!value || typeof value !== "object") return;
    const node = value as Record<string, unknown>;
    const type = node["@type"];
    if (typeof type === "string") types.add(type);
    if (Array.isArray(type)) type.filter((item): item is string => typeof item === "string").forEach((item) => types.add(item));
    const graph = node["@graph"];
    if (Array.isArray(graph)) graph.forEach(collectType);
  }

  for (const text of schemaText) {
    try {
      collectType(JSON.parse(text));
    } catch {
      const matches = text.match(/"@type"\s*:\s*"([^"]+)"/g) ?? [];
      matches.forEach((match) => {
        const type = match.match(/"@type"\s*:\s*"([^"]+)"/)?.[1];
        if (type) types.add(type);
      });
    }
  }

  return [...types];
}

function hasAny(text: string, terms: string[]) {
  const normalized = text.toLowerCase();
  return terms.some((term) => normalized.includes(term));
}

function countMatches(text: string, patterns: RegExp[]) {
  return patterns.reduce((count, pattern) => count + (text.match(pattern)?.length ?? 0), 0);
}

function findInternalLinks($: cheerio.CheerioAPI, baseUrl: string) {
  const base = new URL(baseUrl);
  const links = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    try {
      const resolved = new URL(href, baseUrl);
      if (resolved.hostname === base.hostname) {
        resolved.hash = "";
        links.add(resolved.toString());
      }
    } catch {
      // Ignore invalid links.
    }
  });

  return [...links];
}

async function discoverCommonPages(origin: string, internalLinks: string[]) {
  const linkText = internalLinks.join(" ").toLowerCase();
  const aboutFromLinks = /\/about|\/company|\/who-we-are/.test(linkText);
  const contactFromLinks = /\/contact|\/support|\/get-in-touch/.test(linkText);
  const blogFromLinks = /\/blog|\/resources|\/insights|\/learn|\/articles/.test(linkText);

  const [aboutPathFound, contactPathFound, blogPathFound] = await Promise.all([
    aboutFromLinks ? Promise.resolve(true) : anyPageExists([`${origin}/about`, `${origin}/about-us`, `${origin}/company`]),
    contactFromLinks ? Promise.resolve(true) : anyPageExists([`${origin}/contact`, `${origin}/contact-us`, `${origin}/support`]),
    blogFromLinks ? Promise.resolve(true) : anyPageExists([`${origin}/blog`, `${origin}/resources`, `${origin}/insights`]),
  ]);

  return {
    aboutFound: aboutPathFound,
    contactFound: contactPathFound,
    blogFound: blogPathFound,
  };
}

function buildChecks(input: SignalInput) {
  const lowerBody = input.bodyText.toLowerCase();
  const h2QuestionCount = input.h2s.filter((heading) => /\?|^(what|why|how|when|where|who)\b/i.test(heading)).length;
  const answerStyleSignals = countMatches(lowerBody, [/\bwhat is\b/g, /\bhow to\b/g, /\bwhy\b/g, /\bbenefits?\b/g, /\bfeatures?\b/g, /\bpricing\b/g, /\bimplementation\b/g]);
  const faqLikeSignals = countMatches(lowerBody, [/\bfaq\b/g, /frequently asked questions/g, /\bquestions\b/g]) + h2QuestionCount;
  const trustSignalCount = countMatches(lowerBody, [/\bcase stud(y|ies)\b/g, /\btestimonial(s)?\b/g, /\bcustomer(s)?\b/g, /\bclient(s)?\b/g, /\breview(s)?\b/g, /\biso\b/g, /\bsoc 2\b/g, /\bcertified\b/g, /\bpartner(s)?\b/g]);
  const productTerms = ["software", "platform", "service", "solution", "agency", "consulting", "product", "helps", "for teams", "for businesses", "customers"];

  const hasOrganizationSchema = input.schemaTypes.some((type) => /Organization|LocalBusiness|Corporation|ProfessionalService/i.test(type));
  const hasFaqSchema = input.schemaTypes.some((type) => /FAQPage|Question|Answer/i.test(type));

  const checks = {
    fetchStatus: createCheck("Homepage fetch status", input.fetchStatus >= 200 && input.fetchStatus < 400, `HTTP ${input.fetchStatus}`),
    title: createCheck("Page title", input.pageTitle.length >= 18 && input.pageTitle.length <= 70, input.pageTitle || "Missing title"),
    metaDescription: createCheck("Meta description", input.metaDescription.length >= 70 && input.metaDescription.length <= 180, input.metaDescription || "Missing meta description"),
    h1: createCheck("H1 structure", input.h1s.length === 1 && input.h1s[0].length > 12, input.h1s.length ? `${input.h1s.length} H1 found` : "No H1 found"),
    h2: createCheck("H2 structure", input.h2s.length >= 2, `${input.h2s.length} H2 headings found`),
    canonical: createCheck("Canonical tag", input.canonicalHref.length > 0, input.canonicalHref || "Missing canonical tag"),
    openGraph: createCheck("Open Graph tags", input.ogTags.length >= 3, `${input.ogTags.length} Open Graph tags found`),
    structuredData: createCheck("Structured data/schema", input.schemaTypes.length > 0, input.schemaTypes.length ? input.schemaTypes.join(", ") : "No JSON-LD schema found"),
    organizationSchema: createCheck("Organization schema", hasOrganizationSchema, hasOrganizationSchema ? "Organization-like schema found" : "No Organization schema found"),
    faqSchema: createCheck("FAQ schema", hasFaqSchema, hasFaqSchema ? "FAQ-like schema found" : "No FAQ schema found"),
    robots: createCheck("Robots.txt", input.robotsFound, input.robotsFound ? "robots.txt found" : "robots.txt not found"),
    sitemap: createCheck("Sitemap.xml", input.sitemapFound, input.sitemapFound ? "sitemap.xml found" : "sitemap.xml not found"),
    aboutPage: createCheck("About page existence", input.aboutFound, input.aboutFound ? "About page/link found" : "About page not found"),
    contactPage: createCheck("Contact page existence", input.contactFound, input.contactFound ? "Contact page/link found" : "Contact page not found"),
    blogPage: createCheck("Blog/resources page existence", input.blogFound, input.blogFound ? "Blog/resources page/link found" : "Blog/resources page not found"),
    trustSignals: createCheck("Trust signals", trustSignalCount >= 2, `${trustSignalCount} trust indicators found`),
    caseStudySignals: createCheck("Case study/testimonial indicators", hasAny(lowerBody, ["case study", "case studies", "testimonial", "testimonials", "reviews", "customers", "clients"]), "Checked for case studies, testimonials, reviews, customers, and clients"),
    internalLinks: createCheck("Internal links", input.internalLinks.length >= 8, `${input.internalLinks.length} internal links found`),
    answerStyleContent: createCheck("Answer-style content", answerStyleSignals >= 3 || h2QuestionCount >= 2, `${answerStyleSignals} answer signals and ${h2QuestionCount} question headings found`),
    faqLikeContent: createCheck("FAQ-like content", faqLikeSignals >= 2, `${faqLikeSignals} FAQ-like signals found`),
    clearExplanation: createCheck("Clear product/service explanation", input.bodyText.length > 1200 && hasAny(lowerBody, productTerms), "Checked for product, service, platform, solution, audience, and outcome language"),
  };

  return {
    checks,
    metrics: {
      answerStyleSignals,
      faqLikeSignals,
      trustSignalCount,
      hasOrganizationSchema,
      hasFaqSchema,
    },
  };
}

function buildScores(checks: Record<string, AuditCheck>) {
  const item = (key: keyof typeof checks, weight: number): ScoreItem => ({ passed: checks[key].passed, weight });

  const technicalReadiness = score([
    item("fetchStatus", 12), item("canonical", 10), item("openGraph", 10), item("structuredData", 15), item("organizationSchema", 10), item("faqSchema", 8), item("robots", 10), item("sitemap", 10), item("internalLinks", 15),
  ]);
  const contentReadiness = score([
    item("title", 10), item("metaDescription", 10), item("h1", 12), item("h2", 10), item("answerStyleContent", 20), item("faqLikeContent", 15), item("clearExplanation", 18), item("blogPage", 5),
  ]);
  const citationReadiness = score([
    item("aboutPage", 12), item("contactPage", 12), item("trustSignals", 20), item("caseStudySignals", 18), item("organizationSchema", 14), item("structuredData", 12), item("clearExplanation", 12),
  ]);
  const aeoReadiness = score([
    item("answerStyleContent", 24), item("faqLikeContent", 22), item("faqSchema", 15), item("h2", 12), item("metaDescription", 10), item("clearExplanation", 17),
  ]);
  const geoReadiness = score([
    item("structuredData", 16), item("organizationSchema", 14), item("openGraph", 10), item("trustSignals", 18), item("internalLinks", 14), item("clearExplanation", 16), item("aboutPage", 6), item("contactPage", 6),
  ]);
  const aiVisibility = clampScore((aeoReadiness * 0.22) + (geoReadiness * 0.22) + (citationReadiness * 0.2) + (contentReadiness * 0.18) + (technicalReadiness * 0.18));

  return {
    aiVisibility,
    aeoReadiness,
    geoReadiness,
    citationReadiness,
    contentReadiness,
    technicalReadiness,
  } satisfies Record<ScoreName, number>;
}

function addIfFailed(findings: AuditFinding[], check: AuditCheck, finding: AuditFinding) {
  if (!check.passed) findings.push(finding);
}

function buildFindings(checks: Record<string, AuditCheck>) {
  const findings: AuditFinding[] = [];

  addIfFailed(findings, checks.clearExplanation, createFinding("Product or service explanation is not clear enough for AI summaries", "AI systems need concise entity, category, audience, and outcome language to describe a brand accurately.", "High", "Rewrite the hero and first 300 words to state what the company does, who it serves, and the outcome it delivers.", "Marketing"));
  addIfFailed(findings, checks.answerStyleContent, createFinding("Answer-style content is limited", "AEO readiness improves when pages directly answer buyer questions in extractable sections.", "High", "Add concise answer blocks for what the company does, who it is for, pricing or engagement model, implementation, proof, and comparison questions.", "Content"));
  addIfFailed(findings, checks.faqLikeContent, createFinding("FAQ-like content is thin", "AI answer engines often rely on direct Q&A structures to understand common buyer intent.", "Medium", "Add a buyer-focused FAQ section with direct answers and support it with FAQPage schema only where visible FAQs exist.", "Content"));
  addIfFailed(findings, checks.structuredData, createFinding("Structured data is missing or limited", "Schema helps machines identify the organization, services, page purpose, and answer content.", "High", "Add validated JSON-LD for Organization, WebSite, Service, and FAQPage where the visible page content supports it.", "Developer"));
  addIfFailed(findings, checks.organizationSchema, createFinding("Organization schema is missing", "Organization schema strengthens entity clarity and helps connect brand, website, logo, and same-as profiles.", "Medium", "Add Organization schema with name, URL, logo, contact point, and sameAs profiles.", "Developer"));
  addIfFailed(findings, checks.metaDescription, createFinding("Meta description is weak or missing", "A strong description reinforces the brand category and value proposition for search previews and AI summaries.", "Medium", "Write a 70-180 character description that includes category, audience, and primary outcome.", "Marketing"));
  addIfFailed(findings, checks.h1, createFinding("H1 structure needs cleanup", "A single clear H1 helps search and AI systems identify the page topic.", "Medium", "Use one descriptive H1 that names the product/service category and outcome.", "Content"));
  addIfFailed(findings, checks.trustSignals, createFinding("Trust signals are not prominent enough", "Citation readiness improves when proof, customers, reviews, certifications, and case examples are easy to find.", "High", "Add proof blocks near core explanations: client names, testimonials, case studies, certifications, metrics, or partner badges.", "Marketing"));
  addIfFailed(findings, checks.caseStudySignals, createFinding("Case study or testimonial indicators are limited", "AI systems may prefer competitors with stronger external proof and customer evidence.", "Medium", "Add case studies, testimonials, customer stories, review snippets, or quantified outcomes.", "Marketing"));
  addIfFailed(findings, checks.internalLinks, createFinding("Internal links do not expose enough supporting context", "Internal links help AI systems discover proof, use cases, resources, and service detail pages.", "Medium", "Link from the homepage to key product/service, about, contact, case study, and resource pages using descriptive anchor text.", "Developer"));
  addIfFailed(findings, checks.canonical, createFinding("Canonical tag is missing", "Canonical tags reduce ambiguity about the preferred URL for indexing and summarization.", "Low", "Add a canonical URL to the homepage template.", "Developer"));
  addIfFailed(findings, checks.sitemap, createFinding("Sitemap.xml was not detected", "A sitemap helps search systems discover important pages and content updates.", "Low", "Publish and submit a sitemap.xml that includes core product, about, contact, blog, and resource pages.", "Developer"));
  addIfFailed(findings, checks.robots, createFinding("Robots.txt was not detected", "Robots.txt provides crawl guidance and can point crawlers to the sitemap.", "Low", "Add a robots.txt file with sitemap location and clear crawl permissions.", "Developer"));
  addIfFailed(findings, checks.aboutPage, createFinding("About page was not detected", "About pages reinforce entity clarity, leadership context, and brand trust.", "Medium", "Add or clearly link an About page that explains company background, leadership, market, and credibility.", "Marketing"));
  addIfFailed(findings, checks.contactPage, createFinding("Contact page was not detected", "Contact information is a practical trust signal for buyers and crawlers.", "Medium", "Add or clearly link a Contact page with company email, location or service area, and support path.", "Marketing"));
  addIfFailed(findings, checks.blogPage, createFinding("Blog or resources page was not detected", "Educational content helps cover long-tail buyer questions and strengthens topical authority.", "Low", "Add resources, guides, FAQs, or blog content around buyer questions and category education.", "Content"));

  if (findings.length === 0) {
    findings.push(createFinding("Core AI visibility signals are present, but depth can still improve", "Private beta reports should still identify where teams can build stronger AEO/GEO coverage.", "Low", "Expand buyer FAQs, proof blocks, schema coverage, and comparison-ready content across deeper pages.", "Content"));
  }

  const priorityOrder: Record<FindingPriority, number> = { High: 0, Medium: 1, Low: 2 };
  return findings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function buildDeveloperNotes(checks: Record<string, AuditCheck>) {
  const notes = [
    checks.structuredData.passed ? "Structured data was detected; validate JSON-LD and expand coverage only where page content supports it." : "Add validated JSON-LD for Organization, WebSite, Service, and FAQPage where appropriate.",
    checks.canonical.passed ? "Canonical tag is present; confirm it points to the preferred final URL." : "Add a canonical tag to the homepage template.",
    checks.internalLinks.passed ? "Internal link coverage is healthy; review anchor text for descriptive service and proof links." : "Add crawlable internal links to about, contact, services, use cases, case studies, and resources.",
    checks.robots.passed ? "Robots.txt is available; ensure it references sitemap.xml." : "Publish robots.txt and include sitemap location.",
    checks.sitemap.passed ? "Sitemap.xml is available; keep key pages current." : "Publish sitemap.xml and include priority product, proof, and resource pages.",
  ];

  return notes;
}

function buildRecommendations(findings: AuditFinding[]) {
  return findings.slice(0, 8).map((finding) => `${finding.owner}: ${finding.recommendedFix}`);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuditRequest;
    const normalizedUrl = normalizeWebsiteUrl(body.url ?? "");

    if (!normalizedUrl) {
      return NextResponse.json({ error: "Please enter a valid website, for example byldgroup.com" }, { status: 400 });
    }

    let homepageResponse: Response;
    try {
      homepageResponse = await fetchHomepage(normalizedUrl);
    } catch {
      return NextResponse.json({ error: "Could not fetch the website. Please check the URL and try again." }, { status: 502 });
    }
    const html = await homepageResponse.text();
    const finalUrl = homepageResponse.url || normalizedUrl;
    const final = new URL(finalUrl);
    const origin = final.origin;

    if (!homepageResponse.ok || !html.trim()) {
      return NextResponse.json({ error: `Could not fetch the homepage. Status: ${homepageResponse.status}` }, { status: 502 });
    }

    const $ = cheerio.load(html);
    const pageTitle = cleanText($("title").first().text());
    const metaDescription = cleanText($('meta[name="description"]').attr("content") ?? $('meta[property="og:description"]').attr("content") ?? "");
    const h1s = $("h1").map((_, element) => cleanText($(element).text())).get().filter(Boolean).slice(0, 8);
    const h2s = $("h2").map((_, element) => cleanText($(element).text())).get().filter(Boolean).slice(0, 16);
    const canonicalHref = $('link[rel="canonical"]').attr("href") ?? "";
    const ogTags = $('meta[property^="og:"]').map((_, element) => $(element).attr("property") ?? "").get().filter(Boolean);
    const schemaText = $('script[type="application/ld+json"]').map((_, element) => cleanText($(element).text())).get().filter(Boolean);
    const schemaTypes = extractSchemaTypes(schemaText);
    const internalLinks = findInternalLinks($, finalUrl);

    $("script, style, noscript, svg, canvas").remove();
    const bodyText = cleanText($("body").text()).slice(0, maxBodyChars);

    const [robotsFound, sitemapFound, commonPages] = await Promise.all([
      exists(`${origin}/robots.txt`),
      exists(`${origin}/sitemap.xml`),
      discoverCommonPages(origin, internalLinks),
    ]);

    const signalInput: SignalInput = {
      finalUrl,
      origin,
      fetchStatus: homepageResponse.status,
      html,
      pageTitle,
      metaDescription,
      h1s,
      h2s,
      canonicalHref,
      ogTags,
      schemaTypes,
      internalLinks,
      bodyText,
      robotsFound,
      sitemapFound,
      ...commonPages,
    };

    const { checks, metrics } = buildChecks(signalInput);
    const scores = buildScores(checks);
    const findings = buildFindings(checks);

    const report: WebsiteAuditReport = {
      reportVersion: "website-readiness-v1",
      websiteUrl: normalizedUrl,
      finalUrl,
      scannedAt: new Date().toISOString(),
      fetchStatus: homepageResponse.status,
      pageTitle,
      metaDescription,
      h1s,
      h2s,
      scores,
      checks,
      findings,
      fixes: findings.slice(0, 3),
      developerNotes: buildDeveloperNotes(checks),
      fullRecommendations: buildRecommendations(findings),
      structuredDataSummary: {
        schemaCount: schemaText.length,
        schemaTypes,
        hasOrganizationSchema: metrics.hasOrganizationSchema,
        hasFaqSchema: metrics.hasFaqSchema,
      },
      contentSummary: {
        internalLinkCount: internalLinks.length,
        answerStyleSignals: metrics.answerStyleSignals,
        faqLikeSignals: metrics.faqLikeSignals,
        trustSignalCount: metrics.trustSignalCount,
      },
    };

    return NextResponse.json({ report });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not complete the website-based audit.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

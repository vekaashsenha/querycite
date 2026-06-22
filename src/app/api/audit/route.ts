import * as cheerio from "cheerio";
import { NextResponse } from "next/server";
import type { AuditCheck, AuditFinding, CrawlerAccessResult, FindingOwner, FindingPriority, LlmsTxtResult, ScoreName, WebsiteAuditReport } from "@/lib/audit-report";
import { normalizeWebsiteUrl } from "@/lib/url";
import { getCurrentUser, syncAuthenticatedUser, type QueryCiteUser } from "@/lib/auth/server";
import { insertSupabaseRow, isSupabaseAdminConfigured } from "@/lib/supabase/admin";

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
  crawlerScore: number;
  llmsTxt: LlmsTxtResult;
  aboutFound: boolean;
  contactFound: boolean;
  blogFound: boolean;
};

type ScoreItem = {
  passed: boolean;
  weight: number;
};

type TextResource = {
  url: string;
  found: boolean;
  statusCode: number;
  text: string;
};

type RobotRule = {
  field: "allow" | "disallow";
  value: string;
};

type RobotGroup = {
  agents: string[];
  rules: RobotRule[];
};

const userAgent = "Mozilla/5.0 (compatible; QueryCiteBeta/1.0; +https://querycite.com)";
const timeoutMs = 12000;
const maxBodyChars = 30000;

const isDevelopment = process.env.NODE_ENV !== "production";

function logAuditDebug(label: string, payload: Record<string, unknown>) {
  if (!isDevelopment) return;
  console.log(`[QueryCite audit] ${label}`, payload);
}
const crawlerBots = [
  { bot: "GPTBot", important: true },
  { bot: "OAI-SearchBot", important: true },
  { bot: "ChatGPT-User", important: true },
  { bot: "ClaudeBot", important: true },
  { bot: "Claude-SearchBot", important: true },
  { bot: "PerplexityBot", important: true },
  { bot: "Google-Extended", important: true },
  { bot: "Googlebot", important: false },
  { bot: "Bingbot", important: false },
  { bot: "CCBot", important: true },
] as const;

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

async function fetchTextResource(url: string): Promise<TextResource> {
  try {
    const response = await fetchWithTimeout(url, { method: "GET" });
    const text = response.ok ? await response.text() : "";
    return { url: response.url || url, found: response.ok, statusCode: response.status, text };
  } catch {
    return { url, found: false, statusCode: 0, text: "" };
  }
}

async function exists(url: string) {
  const response = await fetchTextResource(url);
  return response.found;
}

async function firstExistingUrl(urls: string[]) {
  const results = await Promise.all(urls.map((url) => fetchTextResource(url)));
  const found = results.find((result) => result.found);
  return found?.url ?? null;
}

function parseRobotsTxt(text: string): RobotGroup[] {
  const groups: RobotGroup[] = [];
  let current: RobotGroup | null = null;

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.split("#")[0].trim();
    if (!line) {
      if (current?.agents.length || current?.rules.length) current = null;
      continue;
    }

    const [rawField, ...rest] = line.split(":");
    const field = rawField.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (field === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      continue;
    }

    if ((field === "allow" || field === "disallow") && current) {
      current.rules.push({ field, value });
    }
  }

  return groups.filter((group) => group.agents.length > 0);
}

function botStatusFromRules(bot: string, important: boolean, robots: TextResource): CrawlerAccessResult {
  if (!robots.found) {
    return { bot, important, status: "Needs review", ruleSource: "missing robots", detail: "robots.txt was not found, so crawler access could not be confirmed." };
  }

  const groups = parseRobotsTxt(robots.text);
  const normalizedBot = bot.toLowerCase();
  const directGroups = groups.filter((group) => group.agents.includes(normalizedBot));
  const wildcardGroups = groups.filter((group) => group.agents.includes("*"));
  const sourceGroups = directGroups.length > 0 ? directGroups : wildcardGroups;
  const ruleSource = directGroups.length > 0 ? "direct" : wildcardGroups.length > 0 ? "wildcard" : "none";

  if (sourceGroups.length === 0) {
    return { bot, important, status: "Not mentioned", ruleSource, detail: "No direct or wildcard robots.txt rule was detected for this crawler." };
  }

  const rules = sourceGroups.flatMap((group) => group.rules);
  if (rules.length === 0) {
    return { bot, important, status: "Allowed", ruleSource, detail: "Crawler group is present without blocking rules." };
  }

  const allowsRoot = rules.some((rule) => rule.field === "allow" && (rule.value === "/" || rule.value === ""));
  const blocksRoot = rules.some((rule) => rule.field === "disallow" && rule.value === "/");
  const emptyDisallow = rules.some((rule) => rule.field === "disallow" && rule.value === "");
  const partialDisallows = rules.filter((rule) => rule.field === "disallow" && rule.value && rule.value !== "/");

  if (blocksRoot && !allowsRoot) {
    return { bot, important, status: "Blocked", ruleSource, detail: "robots.txt includes Disallow: / for this crawler scope." };
  }

  if (allowsRoot || emptyDisallow) {
    return { bot, important, status: "Allowed", ruleSource, detail: "robots.txt appears to allow broad access for this crawler scope." };
  }

  if (partialDisallows.length > 0) {
    return { bot, important, status: "Needs review", ruleSource, detail: "robots.txt includes partial disallow rules that should be reviewed." };
  }

  return { bot, important, status: "Not mentioned", ruleSource, detail: "No clear allow or block rule was detected." };
}

function analyzeCrawlerAccess(robots: TextResource) {
  const botResults = crawlerBots.map(({ bot, important }) => botStatusFromRules(bot, important, robots));
  let value = robots.found ? 70 : 62;

  for (const result of botResults) {
    if (result.status === "Allowed") value += result.important ? 3 : 2;
    if (result.status === "Needs review") value -= 2;
    if (result.status === "Blocked") value -= result.important ? 8 : 5;
  }

  return {
    score: clampScore(value),
    botResults,
    note: "This checks crawler access signals from robots.txt. It does not guarantee AI citation or inclusion.",
  };
}

function analyzeLlmsTxt(resource: TextResource): LlmsTxtResult {
  const content = resource.text.trim();
  const contentLength = content.length;
  const hasUsefulReferences = /https?:\/\//i.test(content) || /\[[^\]]+\]\([^\)]+\)/.test(content) || /^[-*]\s+\//m.test(content) || /\/about|\/contact|\/blog|\/resources|\/services/i.test(content);
  const isEmptyOrThin = contentLength < 200;

  return {
    url: resource.url,
    found: resource.found,
    statusCode: resource.statusCode,
    contentLength,
    hasUsefulReferences,
    isEmptyOrThin,
    detail: resource.found
      ? `llms.txt returned ${resource.statusCode} with ${contentLength} characters${hasUsefulReferences ? " and useful page references" : " but limited page references"}.`
      : `llms.txt was not found. Status: ${resource.statusCode || "fetch failed"}.`,
  };
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

function firstInternalMatch(internalLinks: string[], pattern: RegExp) {
  return internalLinks.find((link) => pattern.test(new URL(link).pathname.toLowerCase())) ?? null;
}

async function discoverCommonPages(origin: string, internalLinks: string[]) {
  const aboutFromLinks = firstInternalMatch(internalLinks, /\/about|\/company|\/who-we-are/);
  const contactFromLinks = firstInternalMatch(internalLinks, /\/contact|\/support|\/get-in-touch/);
  const blogFromLinks = firstInternalMatch(internalLinks, /\/blog|\/resources|\/insights|\/learn|\/articles/);

  const [aboutUrl, contactUrl, resourcesUrl] = await Promise.all([
    aboutFromLinks ? Promise.resolve(aboutFromLinks) : firstExistingUrl([`${origin}/about`, `${origin}/about-us`, `${origin}/company`]),
    contactFromLinks ? Promise.resolve(contactFromLinks) : firstExistingUrl([`${origin}/contact`, `${origin}/contact-us`, `${origin}/support`]),
    blogFromLinks ? Promise.resolve(blogFromLinks) : firstExistingUrl([`${origin}/blog`, `${origin}/resources`, `${origin}/insights`]),
  ]);

  return {
    aboutFound: Boolean(aboutUrl),
    contactFound: Boolean(contactUrl),
    blogFound: Boolean(resourcesUrl),
    aboutUrl,
    contactUrl,
    resourcesUrl,
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
  const hasArticleSchema = input.schemaTypes.some((type) => /Article|BlogPosting|NewsArticle/i.test(type));
  const crawlerDetail = input.crawlerScore >= 70 ? `AI crawler readiness score ${input.crawlerScore}/100` : "Important AI/search crawler rules may be blocked or need review";

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
    articleSchema: createCheck("Article/blog schema", hasArticleSchema, hasArticleSchema ? "Article or blog schema found" : "No Article or BlogPosting schema found"),
    robots: createCheck("Robots.txt", input.robotsFound, input.robotsFound ? "robots.txt found" : "robots.txt not found"),
    aiCrawlerAccess: createCheck("AI crawler access signals", input.crawlerScore >= 70, crawlerDetail),
    llmsTxt: createCheck("llms.txt", input.llmsTxt.found && input.llmsTxt.hasUsefulReferences && !input.llmsTxt.isEmptyOrThin, input.llmsTxt.detail),
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
      hasArticleSchema,
    },
  };
}

function buildScores(checks: Record<string, AuditCheck>, crawlerScore: number) {
  const item = (key: keyof typeof checks, weight: number): ScoreItem => ({ passed: checks[key].passed, weight });

  const aiCrawlerReadiness = crawlerScore;
  const technicalReadiness = score([
    item("fetchStatus", 10), item("canonical", 8), item("openGraph", 8), item("structuredData", 13), item("organizationSchema", 8), item("faqSchema", 7), item("robots", 8), item("aiCrawlerAccess", 10), item("llmsTxt", 8), item("sitemap", 8), item("internalLinks", 12),
  ]);
  const contentReadiness = score([
    item("title", 10), item("metaDescription", 10), item("h1", 12), item("h2", 10), item("answerStyleContent", 20), item("faqLikeContent", 15), item("clearExplanation", 18), item("blogPage", 3), item("articleSchema", 2),
  ]);
  const citationReadiness = score([
    item("aboutPage", 12), item("contactPage", 12), item("trustSignals", 20), item("caseStudySignals", 18), item("organizationSchema", 14), item("structuredData", 12), item("clearExplanation", 12),
  ]);
  const aeoReadiness = score([
    item("answerStyleContent", 24), item("faqLikeContent", 22), item("faqSchema", 15), item("h2", 12), item("metaDescription", 10), item("clearExplanation", 17),
  ]);
  const geoReadiness = score([
    item("structuredData", 13), item("organizationSchema", 12), item("openGraph", 8), item("trustSignals", 16), item("internalLinks", 12), item("clearExplanation", 15), item("aboutPage", 5), item("contactPage", 5), item("llmsTxt", 7), item("aiCrawlerAccess", 7),
  ]);
  const aiVisibility = clampScore((aeoReadiness * 0.19) + (geoReadiness * 0.2) + (aiCrawlerReadiness * 0.14) + (citationReadiness * 0.17) + (contentReadiness * 0.15) + (technicalReadiness * 0.15));

  return {
    aiVisibility,
    aeoReadiness,
    geoReadiness,
    aiCrawlerReadiness,
    citationReadiness,
    contentReadiness,
    technicalReadiness,
  } satisfies Record<ScoreName, number>;
}

function addIfFailed(findings: AuditFinding[], check: AuditCheck, finding: AuditFinding) {
  if (!check.passed) findings.push(finding);
}

function buildFindings(checks: Record<string, AuditCheck>, llmsTxt: LlmsTxtResult, crawlerResults: CrawlerAccessResult[]) {
  const findings: AuditFinding[] = [];
  const blockedImportantCrawlers = crawlerResults.filter((result) => result.important && result.status === "Blocked");

  addIfFailed(findings, checks.clearExplanation, createFinding("Product or service explanation is not clear enough for AI summaries", "AI systems need concise entity, category, audience, and outcome language to describe a brand accurately.", "High", "Rewrite the hero and first 300 words to state what the company does, who it serves, and the outcome it delivers.", "Marketing"));
  addIfFailed(findings, checks.answerStyleContent, createFinding("Answer-style content is limited", "AEO readiness improves when pages directly answer buyer questions in extractable sections.", "High", "Add concise answer blocks for what the company does, who it is for, pricing or engagement model, implementation, proof, and comparison questions.", "Content"));
  addIfFailed(findings, checks.faqLikeContent, createFinding("FAQ-like content is thin", "AI answer engines often rely on direct Q&A structures to understand common buyer intent.", "Medium", "Add a buyer-focused FAQ section with direct answers and support it with FAQPage schema only where visible FAQs exist.", "Content"));
  addIfFailed(findings, checks.structuredData, createFinding("Structured data is missing or limited", "Schema helps machines identify the organization, services, page purpose, and answer content.", "High", "Add validated JSON-LD for Organization, WebSite, Service, and FAQPage where the visible page content supports it.", "Developer"));
  if (blockedImportantCrawlers.length > 0) {
    findings.push(createFinding("Important AI crawler access is blocked", "robots.txt appears to block one or more AI/search crawler signals that may be relevant to AI discovery workflows.", "High", `Review robots.txt rules for ${blockedImportantCrawlers.map((result) => result.bot).join(", ")} and decide whether access should be allowed for public pages.`, "Developer"));
  }
  if (!llmsTxt.found) {
    findings.push(createFinding("Missing llms.txt guidance file", "llms.txt can provide AI systems and agents with a curated map of important pages, but it is not a replacement for schema, sitemap, or strong content.", "Medium", "Create a concise llms.txt file with homepage, about, contact, product/service, proof, and resource links, then upload it at /llms.txt.", "Developer"));
  } else if (llmsTxt.isEmptyOrThin || !llmsTxt.hasUsefulReferences) {
    findings.push(createFinding("llms.txt is too thin or lacks useful page references", "A thin llms.txt file gives agents little guidance about the pages that matter most.", "Medium", "Expand llms.txt with curated page references, short context, and important public URLs.", "Content"));
  }
  addIfFailed(findings, checks.organizationSchema, createFinding("Organization schema is missing", "Organization schema strengthens entity clarity and helps connect brand, website, logo, and same-as profiles.", "Medium", "Add Organization schema with name, URL, logo, contact point, and sameAs profiles.", "Developer"));
  addIfFailed(findings, checks.metaDescription, createFinding("Meta description is weak or missing", "A strong description reinforces the brand category and value proposition for search previews and AI summaries.", "Medium", "Write a 70-180 character description that includes category, audience, and primary outcome.", "Marketing"));
  addIfFailed(findings, checks.h1, createFinding("H1 structure needs cleanup", "A single clear H1 helps search and AI systems identify the page topic.", "Medium", "Use one descriptive H1 that names the product/service category and outcome.", "Content"));
  addIfFailed(findings, checks.trustSignals, createFinding("Trust signals are not prominent enough", "Citation readiness improves when proof, customers, reviews, certifications, and case examples are easy to find.", "High", "Add proof blocks near core explanations: client names, testimonials, case studies, certifications, metrics, or partner badges.", "Marketing"));
  addIfFailed(findings, checks.caseStudySignals, createFinding("Case study or testimonial indicators are limited", "AI systems may prefer competitors with stronger external proof and customer evidence.", "Medium", "Add case studies, testimonials, customer stories, review snippets, or quantified outcomes.", "Marketing"));
  addIfFailed(findings, checks.internalLinks, createFinding("Internal links do not expose enough supporting context", "Internal links help AI systems discover proof, use cases, resources, and service detail pages.", "Medium", "Link from the homepage to key product/service, about, contact, case study, and resource pages using descriptive anchor text.", "Developer"));
  addIfFailed(findings, checks.canonical, createFinding("Canonical tag is missing", "Canonical tags reduce ambiguity about the preferred URL for indexing and summarization.", "Low", "Add a canonical URL to the homepage template.", "Developer"));
  addIfFailed(findings, checks.sitemap, createFinding("Sitemap.xml was not detected", "A sitemap helps search systems discover important pages and content updates.", "Low", "Publish and submit a sitemap.xml that includes core product, about, contact, blog, and resource pages.", "Developer"));
  addIfFailed(findings, checks.robots, createFinding("Robots.txt was not detected", "Robots.txt provides crawl guidance and can point crawlers to the sitemap. Missing robots.txt is a warning, not an automatic failure.", "Low", "Add a robots.txt file with sitemap location and clear crawl permissions for public pages.", "Developer"));
  addIfFailed(findings, checks.aboutPage, createFinding("About page was not detected", "About pages reinforce entity clarity, leadership context, and brand trust.", "Medium", "Add or clearly link an About page that explains company background, leadership, market, and credibility.", "Marketing"));
  addIfFailed(findings, checks.contactPage, createFinding("Contact page was not detected", "Contact information is a practical trust signal for buyers and crawlers.", "Medium", "Add or clearly link a Contact page with company email, location or service area, and support path.", "Marketing"));
  addIfFailed(findings, checks.blogPage, createFinding("Blog or resources page was not detected", "Educational content helps cover long-tail buyer questions and strengthens topical authority.", "Low", "Add resources, guides, FAQs, or blog content around buyer questions and category education.", "Content"));
  addIfFailed(findings, checks.articleSchema, createFinding("Article or blog schema is missing", "Article and BlogPosting schema help machines understand educational resources and topical coverage when those pages exist.", "Low", "Add Article or BlogPosting schema to resource pages where the visible content supports it.", "Developer"));

  if (findings.length === 0) {
    findings.push(createFinding("Core AI visibility signals are present, but depth can still improve", "Private beta reports should still identify where teams can build stronger AEO/GEO coverage.", "Low", "Expand buyer FAQs, proof blocks, schema coverage, llms.txt guidance, and comparison-ready content across deeper pages.", "Content"));
  }

  const priorityOrder: Record<FindingPriority, number> = { High: 0, Medium: 1, Low: 2 };
  return findings.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
}

function buildDeveloperNotes(checks: Record<string, AuditCheck>) {
  const notes = [
    checks.structuredData.passed ? "Structured data was detected; validate JSON-LD and expand coverage only where page content supports it." : "Add validated JSON-LD for Organization, WebSite, Service, and FAQPage where appropriate.",
    checks.llmsTxt.passed ? "llms.txt was detected with useful references; keep it updated as important pages change." : "Create or improve /llms.txt with curated public page references for agents and AI systems.",
    checks.aiCrawlerAccess.passed ? "AI crawler access signals look reasonably open; review robots.txt intentionally before changing crawler rules." : "Review robots.txt for important AI/search crawler access rules and avoid accidental blocking of public pages.",
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

function explainScore(checks: Record<string, AuditCheck>, findings: AuditFinding[], keys: string[]): { helped: string[]; hurt: string[]; fixFirst: string[] } {
  const relevantChecks = keys.map((key) => checks[key]).filter(Boolean);
  const helped = relevantChecks.filter((check) => check.passed).map((check) => check.label).slice(0, 4);
  const hurt = relevantChecks.filter((check) => !check.passed).map((check) => check.label).slice(0, 4);
  const fixFirst = findings
    .filter((finding) => keys.some((key) => checks[key]?.label.toLowerCase().includes(finding.issue.toLowerCase().slice(0, 12))) || finding.priority === "High")
    .map((finding) => finding.recommendedFix)
    .slice(0, 3);

  return {
    helped: helped.length ? helped : ["No strong positive signal found in this score group yet."],
    hurt: hurt.length ? hurt : ["No major blocker found in this score group."],
    fixFirst: fixFirst.length ? fixFirst : findings.slice(0, 3).map((finding) => finding.recommendedFix),
  };
}

function buildScoreExplanations(checks: Record<string, AuditCheck>, findings: AuditFinding[]) {
  return {
    aiVisibility: explainScore(checks, findings, ["clearExplanation", "answerStyleContent", "structuredData", "trustSignals", "internalLinks", "aiCrawlerAccess", "llmsTxt"]),
    aeoReadiness: explainScore(checks, findings, ["answerStyleContent", "faqLikeContent", "faqSchema", "h2", "metaDescription", "clearExplanation"]),
    geoReadiness: explainScore(checks, findings, ["structuredData", "organizationSchema", "openGraph", "trustSignals", "internalLinks", "aboutPage", "contactPage", "llmsTxt", "aiCrawlerAccess"]),
    aiCrawlerReadiness: explainScore(checks, findings, ["robots", "aiCrawlerAccess", "llmsTxt", "sitemap"]),
    citationReadiness: explainScore(checks, findings, ["aboutPage", "contactPage", "trustSignals", "caseStudySignals", "organizationSchema", "structuredData"]),
    contentReadiness: explainScore(checks, findings, ["title", "metaDescription", "h1", "h2", "answerStyleContent", "faqLikeContent", "clearExplanation", "blogPage", "articleSchema"]),
    technicalReadiness: explainScore(checks, findings, ["fetchStatus", "canonical", "openGraph", "structuredData", "organizationSchema", "faqSchema", "robots", "aiCrawlerAccess", "llmsTxt", "sitemap", "internalLinks"]),
  } satisfies Record<ScoreName, { helped: string[]; hurt: string[]; fixFirst: string[] }>;
}

async function persistAuditReport(report: WebsiteAuditReport, normalizedUrl: string, user: QueryCiteUser | null) {
  if (!isSupabaseAdminConfigured()) return { auditId: null, reportId: null };

  try {
    const auditRows = await insertSupabaseRow("audits", {
      user_id: user?.id ?? null,
      website_url: normalizedUrl,
      normalized_url: normalizedUrl,
      final_url: report.finalUrl,
      audit_type: "free",
      status: "completed",
      source: "homepage_form",
      request_payload: { url: normalizedUrl },
      scraped_snapshot: {
        pageTitle: report.pageTitle,
        metaDescription: report.metaDescription,
        h1s: report.h1s,
        h2s: report.h2s,
        structuredDataSummary: report.structuredDataSummary,
        contentSummary: report.contentSummary,
        crawlerReadiness: report.crawlerReadiness,
        llmsTxt: report.llmsTxt,
      },
    });
    const auditId = typeof auditRows[0]?.id === "string" ? auditRows[0].id : null;

    const reportRows = await insertSupabaseRow("reports", {
      audit_id: auditId,
      user_id: user?.id ?? null,
      website_url: report.websiteUrl,
      final_url: report.finalUrl,
      report_type: "free",
      ai_visibility_score: report.scores.aiVisibility,
      aeo_score: report.scores.aeoReadiness,
      geo_score: report.scores.geoReadiness,
      ai_crawler_readiness_score: report.scores.aiCrawlerReadiness,
      citation_readiness_score: report.scores.citationReadiness,
      content_readiness_score: report.scores.contentReadiness,
      technical_readiness_score: report.scores.technicalReadiness,
      findings: report.findings,
      fixes: report.fixes,
      developer_notes: report.developerNotes,
      advisor_context: report,
      full_report_data: report,
    });
    const reportId = typeof reportRows[0]?.id === "string" ? reportRows[0].id : null;

    return { auditId, reportId };
  } catch (error) {
    console.error("Supabase audit persistence failed", error);
    return { auditId: null, reportId: null };
  }
}
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (user) await syncAuthenticatedUser(user);
    const body = (await request.json()) as AuditRequest;
    const submittedUrl = body.url ?? "";
    const normalizedUrl = normalizeWebsiteUrl(submittedUrl);
    logAuditDebug("submitted_url", { submittedUrl, normalizedUrl });

    if (!normalizedUrl) {
      return NextResponse.json({ error: "Please enter a valid website, for example byldgroup.com" }, { status: 400 });
    }

    let homepageResponse: Response;
    try {
      homepageResponse = await fetchHomepage(normalizedUrl);
    } catch (error) {
      logAuditDebug("homepage_fetch_failed", { normalizedUrl, error: error instanceof Error ? error.message : "unknown" });
      return NextResponse.json({ error: "We could not scan this website. Please check the URL and try again." }, { status: 502 });
    }
    const html = await homepageResponse.text();
    const finalUrl = homepageResponse.url || normalizedUrl;
    const final = new URL(finalUrl);
    const origin = final.origin;

    if (!homepageResponse.ok || !html.trim()) {
      logAuditDebug("homepage_fetch_status", { status: homepageResponse.status, finalUrl, hasHtml: Boolean(html.trim()) });
      if ([401, 403, 429].includes(homepageResponse.status)) {
        return NextResponse.json({ error: "This website blocked automated access. Try another website or contact support." }, { status: 502 });
      }
      return NextResponse.json({ error: "We could not scan this website. Please check the URL and try again." }, { status: 502 });
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

    const [robotsResource, sitemapFound, llmsResource, commonPages] = await Promise.all([
      fetchTextResource(`${origin}/robots.txt`),
      exists(`${origin}/sitemap.xml`),
      fetchTextResource(`${origin}/llms.txt`),
      discoverCommonPages(origin, internalLinks),
    ]);
    const crawlerAnalysis = analyzeCrawlerAccess(robotsResource);
    const llmsTxt = analyzeLlmsTxt(llmsResource);
    logAuditDebug("signals_found", {
      fetchStatus: homepageResponse.status,
      titleFound: Boolean(pageTitle),
      metaDescriptionFound: Boolean(metaDescription),
      h1Count: h1s.length,
      schemaCount: schemaText.length,
      robotsFound: robotsResource.found,
      sitemapFound,
      llmsTxtFound: llmsTxt.found,
    });

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
      robotsFound: robotsResource.found,
      sitemapFound,
      crawlerScore: crawlerAnalysis.score,
      llmsTxt,
      ...commonPages,
    };

    const { checks, metrics } = buildChecks(signalInput);
    const scores = buildScores(checks, crawlerAnalysis.score);
    const findings = buildFindings(checks, llmsTxt, crawlerAnalysis.botResults);
    const scoreExplanations = buildScoreExplanations(checks, findings);
    logAuditDebug("result", { scores, findingsCount: findings.length });

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
      scoreExplanations,
      checks,
      findings,
      fixes: findings.slice(0, 3),
      developerNotes: buildDeveloperNotes(checks),
      fullRecommendations: buildRecommendations(findings),
      crawlerReadiness: {
        robotsTxtUrl: robotsResource.url,
        robotsFound: robotsResource.found,
        robotsStatusCode: robotsResource.statusCode,
        score: crawlerAnalysis.score,
        botResults: crawlerAnalysis.botResults,
        note: crawlerAnalysis.note,
      },
      llmsTxt,
      discoveredPages: {
        homepage: finalUrl,
        aboutUrl: commonPages.aboutUrl,
        contactUrl: commonPages.contactUrl,
        resourcesUrl: commonPages.resourcesUrl,
        importantInternalLinks: internalLinks.slice(0, 12),
      },
      structuredDataSummary: {
        schemaCount: schemaText.length,
        schemaTypes,
        hasOrganizationSchema: metrics.hasOrganizationSchema,
        hasFaqSchema: metrics.hasFaqSchema,
        hasArticleSchema: metrics.hasArticleSchema,
      },
      contentSummary: {
        internalLinkCount: internalLinks.length,
        answerStyleSignals: metrics.answerStyleSignals,
        faqLikeSignals: metrics.faqLikeSignals,
        trustSignalCount: metrics.trustSignalCount,
      },
    };

    const savedReport = await persistAuditReport(report, normalizedUrl, user);
    const responseReport: WebsiteAuditReport = {
      ...report,
      reportId: savedReport.reportId ?? undefined,
      auditId: savedReport.auditId,
    };

    return NextResponse.json({ report: responseReport });
  } catch (error) {
    logAuditDebug("unexpected_error", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "The audit service is temporarily unavailable. Please try again." }, { status: 500 });
  }
}

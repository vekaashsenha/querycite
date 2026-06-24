import type { AdvisorActionType } from "@/lib/plans";

type UnknownRecord = Record<string, unknown>;
type AnswerMode = "concise" | "detailed" | "full_solution";

export type AdvisorIntent =
  | "platform_strategy"
  | "blog_ideas"
  | "llms_txt"
  | "schema"
  | "developer_plan"
  | "content_plan"
  | "copy_paste_fixes"
  | "technical_fix"
  | "fix_plan"
  | "first_fix"
  | "competitor"
  | "general";

type GroundedFinding = { issue: string; recommendedFix: string; priority: string; owner: string };
type SitePages = { homepage: string; about: string; contact: string; services: string; pricing: string; resources: string; blog: string; caseStudies: string };

export type AdvisorReportContext = {
  websiteUrl: string;
  origin: string;
  brandName: string;
  serviceName: string;
  companyDescription: string;
  industry: string;
  pageTitle: string;
  h1: string;
  scores: { aiVisibility: number | null; aeo: number | null; geo: number | null; crawler: number | null };
  schemaStatus: string;
  llmsStatus: string;
  competitorStatus: string;
  canonicalStatus: string;
  robotsStatus: string;
  sitemapStatus: string;
  topFindings: GroundedFinding[];
  developerNotes: string[];
  pages: SitePages;
  friendlySummary: string;
  summary: string;
  groundingGroups: string[][];
};

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};
}

function cleanText(value: unknown, maxLength = 500) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function numberValue(...values: unknown[]) {
  for (const value of values) if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  return null;
}

function scoreLine(label: string, value: number | null) {
  return `${label}: ${value === null ? "Not available" : `${value}/100`}`;
}

function urlOrigin(value: string) {
  try { return new URL(value).origin; } catch { return "https://YOUR_DOMAIN.com"; }
}

function urlFor(origin: string, pathname: string) {
  return `${origin.replace(/\/$/, "")}${pathname}`;
}

function extractFindings(report: UnknownRecord) {
  const findings = Array.isArray(report.findings) ? report.findings : Array.isArray(report.topIssues) ? report.topIssues : [];
  return findings.slice(0, 6).map((value): GroundedFinding => {
    if (typeof value === "string") return { issue: cleanText(value), recommendedFix: "Review the matching recommendation in the report.", priority: "Medium", owner: "Marketing" };
    const finding = asRecord(value);
    return {
      issue: cleanText(finding.issue) || "Report finding needs review",
      recommendedFix: cleanText(finding.recommendedFix ?? finding.recommended_fix) || "Apply the recommended fix shown in the report.",
      priority: cleanText(finding.priority, 30) || "Medium",
      owner: cleanText(finding.owner, 30) || "Marketing",
    };
  }).filter((finding) => finding.issue);
}

function extractCompetitorStatus(report: UnknownRecord, competitorData: unknown) {
  const supplied = Array.isArray(competitorData) ? competitorData.length : Object.keys(asRecord(competitorData)).length;
  const reportCompetitor = asRecord(report.competitorSummary ?? report.competitor_summary);
  if (supplied > 0 || Object.keys(reportCompetitor).length > 0) return "Competitor data is available. Use only the supplied comparison signals.";
  return "No scored competitor comparison is available. More comparison scans are needed before naming competitor strengths.";
}

function checkStatus(checks: UnknownRecord, key: string, fallback: string) {
  const check = asRecord(checks[key]);
  if (!Object.keys(check).length) return fallback;
  return `${check.passed ? "Passed" : "Needs attention"}. ${cleanText(check.detail) || fallback}`;
}

function findPage(links: string[], pattern: RegExp, fallback: string) {
  return links.find((link) => pattern.test(link)) || fallback;
}

function extractPages(report: UnknownRecord, origin: string): SitePages {
  const discovered = asRecord(report.discoveredPages ?? report.discovered_pages);
  const links = Array.isArray(discovered.importantInternalLinks) ? discovered.importantInternalLinks.map((link) => cleanText(link, 300)).filter(Boolean) : [];
  return {
    homepage: cleanText(discovered.homepage, 300) || origin,
    about: cleanText(discovered.aboutUrl, 300) || findPage(links, /\/about(?:[/?#]|$)/i, urlFor(origin, "/about")),
    contact: cleanText(discovered.contactUrl, 300) || findPage(links, /\/contact(?:[/?#]|$)/i, urlFor(origin, "/contact")),
    services: findPage(links, /\/(service|product|solution)s?(?:[/?#]|$)/i, urlFor(origin, "/services")),
    pricing: findPage(links, /\/pricing(?:[/?#]|$)/i, urlFor(origin, "/pricing")),
    resources: cleanText(discovered.resourcesUrl, 300) || findPage(links, /\/(resource|guide)s?(?:[/?#]|$)/i, urlFor(origin, "/resources")),
    blog: findPage(links, /\/(blog|insights)(?:[/?#]|$)/i, urlFor(origin, "/blog")),
    caseStudies: findPage(links, /\/(case-stud|customer-stor|success-stor)/i, urlFor(origin, "/case-studies")),
  };
}

function scoreBand(value: number | null) {
  if (value === null) return "not measured";
  if (value >= 75) return "strong";
  if (value >= 55) return "developing";
  return "weak";
}

function buildFriendlySummary(context: Omit<AdvisorReportContext, "friendlySummary" | "summary" | "groundingGroups">) {
  const gaps = context.topFindings.slice(0, 3).map((finding) => finding.issue.toLowerCase());
  const scoreParts = [
    context.scores.aeo === null ? "" : `AEO is ${scoreBand(context.scores.aeo)} at ${context.scores.aeo}/100`,
    context.scores.geo === null ? "" : `GEO is ${scoreBand(context.scores.geo)} at ${context.scores.geo}/100`,
    context.scores.crawler === null ? "" : `crawler readiness is ${scoreBand(context.scores.crawler)} at ${context.scores.crawler}/100`,
  ].filter(Boolean);
  return `Your report shows that ${scoreParts.length ? scoreParts.join(", while ") : "the available readiness data is limited"}. The main gaps are ${gaps.length ? gaps.join(", ") : "the remaining report recommendations"}. Fixing these first will make the website easier for AI and search systems to access, understand, and summarize.`;
}

export function buildAdvisorReportContext(currentReportData: unknown, competitorData: unknown, companyProfile?: unknown): AdvisorReportContext {
  const report = asRecord(currentReportData);
  const company = asRecord(companyProfile);
  const scores = asRecord(report.scores);
  const structured = asRecord(report.structuredDataSummary ?? report.structured_data_summary);
  const checks = asRecord(report.checks);
  const llms = asRecord(report.llmsTxt ?? report.llms_txt);
  const findings = extractFindings(report);
  const developerNotes = (Array.isArray(report.developerNotes) ? report.developerNotes : Array.isArray(report.developer_notes) ? report.developer_notes : []).map((note) => cleanText(note)).filter(Boolean).slice(0, 6);
  const websiteUrl = cleanText(report.finalUrl ?? report.final_url ?? report.websiteUrl ?? report.website_url, 300) || "https://YOUR_DOMAIN.com";
  const origin = urlOrigin(websiteUrl);
  const pageTitle = cleanText(report.pageTitle ?? report.page_title, 200);
  const h1s = Array.isArray(report.h1s) ? report.h1s : [];
  const brandName = cleanText(company.company_name ?? company.companyName, 140) || pageTitle.split(/[|:-]/)[0]?.trim() || "YOUR_COMPANY_NAME";
  const serviceName = cleanText(company.primary_product_service ?? company.primaryProductService, 180) || cleanText(h1s[0], 180) || "YOUR_MAIN_SERVICE";
  const base = {
    websiteUrl, origin, brandName, serviceName,
    companyDescription: cleanText(company.company_description ?? company.companyDescription, 500) || "YOUR_ONE_SENTENCE_COMPANY_DESCRIPTION",
    industry: cleanText(company.industry, 100) || "B2B or service business",
    pageTitle, h1: cleanText(h1s[0], 200),
    scores: {
      aiVisibility: numberValue(scores.aiVisibility, report.aiVisibilityScore, report.ai_visibility_score, report.overallAiVisibilityScore),
      aeo: numberValue(scores.aeoReadiness, report.aeoScore, report.aeo_score),
      geo: numberValue(scores.geoReadiness, report.geoScore, report.geo_score),
      crawler: numberValue(scores.aiCrawlerReadiness, report.aiCrawlerReadinessScore, report.ai_crawler_readiness_score),
    },
    schemaStatus: typeof structured.schemaCount === "number" ? `${structured.schemaCount} schema item${structured.schemaCount === 1 ? "" : "s"} detected; Organization schema: ${structured.hasOrganizationSchema ? "found" : "missing"}; FAQ schema: ${structured.hasFaqSchema ? "found" : "missing"}; Article schema: ${structured.hasArticleSchema ? "found" : "missing"}.` : checkStatus(checks, "structuredData", "Schema status is not available."),
    llmsStatus: Object.keys(llms).length ? `llms.txt is ${llms.found ? "found" : "missing"}. ${cleanText(llms.detail) || "No additional detail."}` : "llms.txt status is not available.",
    competitorStatus: extractCompetitorStatus(report, competitorData),
    canonicalStatus: checkStatus(checks, "canonical", "Canonical tag status is not available."),
    robotsStatus: checkStatus(checks, "robots", "robots.txt status is not available."),
    sitemapStatus: checkStatus(checks, "sitemap", "Sitemap status is not available."),
    topFindings: findings, developerNotes, pages: extractPages(report, origin),
  };
  const friendlySummary = buildFriendlySummary(base);
  const findingLines = findings.length ? findings.map((finding, index) => `${index + 1}. [${finding.priority}] ${finding.issue} | Fix: ${finding.recommendedFix} | Owner: ${finding.owner}`).join("\n") : "No findings were included.";
  const summary = `Website: ${websiteUrl}\nBrand: ${brandName}\nPrimary service: ${serviceName}\n${scoreLine("AI Visibility Score", base.scores.aiVisibility)}\n${scoreLine("AEO Score", base.scores.aeo)}\n${scoreLine("GEO Score", base.scores.geo)}\n${scoreLine("AI Crawler Readiness Score", base.scores.crawler)}\nSchema status: ${base.schemaStatus}\nllms.txt status: ${base.llmsStatus}\nCanonical status: ${base.canonicalStatus}\nrobots.txt status: ${base.robotsStatus}\nSitemap status: ${base.sitemapStatus}\nCompetitor gap status: ${base.competitorStatus}\nTop findings:\n${findingLines}`;
  return {
    ...base, friendlySummary, summary,
    groundingGroups: [
      Object.values(base.scores).filter((score): score is number => score !== null).map((score) => `${score}/100`),
      [base.schemaStatus, "schema", "structured data"], [base.llmsStatus, "llms.txt"], [base.competitorStatus, "competitor"],
      findings.slice(0, 3).flatMap((finding) => [finding.issue, finding.issue.split(/\s+/).slice(0, 6).join(" ")]),
    ].filter((group) => group.length > 0),
  };
}
export function classifyAdvisorIntent(message: string, actionType: AdvisorActionType): { intent: AdvisorIntent; mode: AnswerMode } {
  const text = message.toLowerCase();
  if (/platform|where should i rank|which ai|rank in ai search|chatgpt|perplexity|google ai overview|bing copilot|claude/.test(text)) return { intent: "platform_strategy", mode: "detailed" };
  if (/blog idea|content idea|article idea/.test(text) || actionType === "blog_brief") return { intent: "blog_ideas", mode: "detailed" };
  if (/create.*llms|write.*llms|llms\.txt.*(for me|draft|generate)|copy-paste.*llms/.test(text)) return { intent: "llms_txt", mode: "full_solution" };
  if (/write.*schema|create.*schema|generate.*schema|schema.*(for me|code|json)|organization schema|service schema|faq schema/.test(text)) return { intent: "schema", mode: "full_solution" };
  if (/developer.*fix first|what should.*developer|developer action|developer note/.test(text)) return { intent: "developer_plan", mode: "full_solution" };
  if (/content team|content.*do first|content plan|content brief/.test(text)) return { intent: "content_plan", mode: "full_solution" };
  if (/copy-paste fix|ready-to-paste|fix pack|actual fixes/.test(text)) return { intent: "copy_paste_fixes", mode: "full_solution" };
  if (/canonical|robots\.txt|sitemap|crawlability|crawler issue/.test(text)) return { intent: "technical_fix", mode: "full_solution" };
  if (/aeo\/geo fix plan|30-day|7-day/.test(text) || actionType === "fix_pack") return { intent: "fix_plan", mode: "detailed" };
  if (/what should i fix first|fix first|highest priority/.test(text)) return { intent: "first_fix", mode: "detailed" };
  if (/competitor/.test(text) || actionType === "competitor_advice") return { intent: "competitor", mode: "detailed" };
  return { intent: "general", mode: "concise" };
}

function requiredSections(intent: AdvisorIntent) {
  const map: Record<AdvisorIntent, string[]> = {
    platform_strategy: ["What your report means", "Platform strategy", "Priority for your current report", "Next action"],
    blog_ideas: ["What your report means", "Blog ideas based on your report gaps", "Priority", "Next action"],
    llms_txt: ["What your report means", "What this means", "Copy-paste fix", "Where to paste this", "Step-by-step guide", "How to test it", "Platform-specific notes", "Message to send your developer", "Next action"],
    schema: ["What your report means", "What this means", "Copy-paste fix", "Where to paste this", "Step-by-step guide", "How to test it", "Platform-specific notes", "Message to send your developer", "Next action"],
    developer_plan: ["What your report means", "Developer fixes in priority order", "Copy-paste snippets", "Where to paste them", "How to test", "Message to send your developer", "Next action"],
    content_plan: ["What your report means", "Content priorities", "Page sections", "FAQ ideas", "Internal links and proof", "CTA suggestions", "Next action"],
    copy_paste_fixes: ["What your report means", "Copy-paste schema", "Copy-paste llms.txt", "FAQ suggestions", "Page copy blocks", "Developer notes", "Next action"],
    technical_fix: ["What your report means", "What this means", "Copy-paste fix", "Where to paste this", "Step-by-step guide", "How to test it", "Message to send your developer", "Next action"],
    fix_plan: ["What your report means", "7-day plan", "30-day plan", "Priority", "Next action"],
    first_fix: ["What your report means", "Top 3 fixes", "Why these come first", "Next action"],
    competitor: ["What your report means", "Competitor gaps", "Recommended action", "Next action"],
    general: ["What your report means", "Answer", "Recommended actions", "Next action"],
  };
  return map[intent];
}

function requiredContentGroups(intent: AdvisorIntent, context: AdvisorReportContext) {
  const map: Record<AdvisorIntent, string[][]> = {
    platform_strategy: [["google ai overviews"], ["chatgpt"], ["perplexity"], ["gemini"], ["bing copilot"], ["claude", "other answer engines"], ["no scored competitor", "comparison scans"]],
    blog_ideas: [["target query"], ["buyer intent"], ["outline"], ["faq/schema angle"], ["why this helps ai visibility"], ["how to make your website easier for ai search engines to understand", "why ai search may not mention your brand"]],
    llms_txt: [[`# ${context.brandName}`], [`${context.origin}/llms.txt`], ["wordpress"], ["shopify"], ["webflow"], ["wix"], ["status 200"]],
    schema: [["application/ld+json"], ["organization"], ["website"], ["service"], ["</head>"], ["schema markup validator", "rich results test"], ["your_logo_url"]],
    developer_plan: [["rel=\"canonical\""], ["user-agent: *"], ["sitemap:"], ["application/ld+json"], ["message to send your developer"]],
    content_plan: [["hero"], ["faq ideas"], ["internal links and proof"], ["cta suggestions"], ["book a consultation", "tell us what you need help with"]],
    copy_paste_fixes: [["application/ld+json"], [`# ${context.brandName}`], ["faq suggestions"], ["page copy blocks"], ["developer notes"]],
    technical_fix: [["copy-paste fix"], ["where to paste"], ["how to test"], ["message to send your developer"]],
    fix_plan: [["days 1-2", "day 1"], ["week 1"], ["owner", "developer", "content"]],
    first_fix: [["top 3 fixes"], ["owner"], ["effort", "impact", "implementation"]],
    competitor: [["no scored competitor", "competitor data is available"], ["do not invent", "comparison scans"]],
    general: [],
  };
  return map[intent];
}

function intentInstructions(intent: AdvisorIntent, context: AdvisorReportContext) {
  const technicalFormat = "Explain like a smart beginner. Give actual copy-paste code or text, where it goes, numbered steps, testing instructions, platform guidance for WordPress, Shopify, Webflow, Wix, and custom sites, plus a ready-to-forward developer message.";
  const map: Record<AdvisorIntent, string> = {
    platform_strategy: "Cover Google AI Overviews/Search, ChatGPT, Perplexity, Gemini, Bing Copilot, and Claude/other answer engines. For each include why it matters, what to improve, a practical action, and how this report affects readiness. Then give report-specific priorities.",
    blog_ideas: "Create exactly 5 buyer-facing blog ideas. Never use a raw audit finding as a title. For each use: bold title, Target query, Buyer intent, Outline, FAQ/schema angle, and Why this helps AI visibility. If company context is thin, write for a generic B2B/service-business audience.",
    llms_txt: `${technicalFormat} Generate a complete llms.txt draft using known pages and clearly marked placeholder URLs for missing pages. Explain that it must open at ${context.origin}/llms.txt.`,
    schema: `${technicalFormat} Generate one complete JSON-LD script with Organization, WebSite, and Service nodes. Add FAQPage only when visible FAQs are also recommended. Use uppercase placeholders for missing data. Tell the user to paste it before </head>.`,
    developer_plan: `${technicalFormat} Prioritize developer tasks from the report. Include schema, llms.txt, canonical, robots, or sitemap snippets where the report supports them.`,
    content_plan: "Create a done-for-you content plan with page sections, direct-answer copy, five FAQs, internal links, proof points, and CTA suggestions. Give content-ready wording, not vague advice.",
    copy_paste_fixes: "Create a full solution pack with schema snippets, an llms.txt draft, five visible FAQ suggestions, homepage/service-page copy blocks, and developer notes. Use placeholders only when report or company data is missing.",
    technical_fix: `${technicalFormat} Generate the relevant canonical, robots.txt, sitemap, crawler, or schema fix based on the question and report.`,
    fix_plan: "Create a practical 7-day and 30-day plan with owners, exact deliverables, and report-backed priorities.",
    first_fix: "Give the top 3 fixes in priority order with report evidence, effort, impact, owner, and the exact first implementation step.",
    competitor: "Use only supplied competitor data. If comparison scans are missing, say so and do not invent competitor scores or strengths.",
    general: "Answer the relevant AEO/GEO or AI visibility question directly. Use report data where available, general best practices where useful, and a clear caveat when data is missing.",
  };
  return map[intent];
}

export function buildAdvisorPrompts(input: {
  message: string;
  currentReportData: unknown;
  companyProfile: unknown;
  competitorData: unknown;
  chatHistory: unknown;
  actionType: AdvisorActionType;
  offTopicReply: string;
  minWords: number;
}) {
  const reportContext = buildAdvisorReportContext(input.currentReportData, input.competitorData, input.companyProfile);
  const { intent, mode } = classifyAdvisorIntent(input.message, input.actionType);
  const sections = requiredSections(intent);
  const headings = sections.map((section) => `## ${section}`).join("\n");
  const companyContext = JSON.stringify(input.companyProfile || {}).slice(0, 2_400);
  const competitorContext = JSON.stringify(input.competitorData || {}).slice(0, 2_400);
  const historyContext = JSON.stringify(input.chatHistory || []).slice(0, 3_000);
  const lengthRule = mode === "concise" ? "Prefer 180-350 words." : mode === "detailed" ? "Prefer 350-700 words." : "Use as much space as needed for complete copy-paste assets, usually 600-1400 words.";
  const sharedRules = `Use these exact markdown headings, in this order:\n${headings}\n\nBehavior:\n- You are a trusted implementation buddy for founders and non-technical marketers, not a consultant writing vague recommendations.\n- Start with a friendly explanation of the report, not a raw technical dump. Weave available scores and important gaps into plain English.\n- Use the report first, then AEO/GEO best practices, and state clearly when data is missing.\n- ${intentInstructions(intent, reportContext)}\n- Use simple verbs: Open this, Copy this, Paste it here, Replace this placeholder, Save, Test it.\n- Do not invent company details, page URLs, competitor results, or implementation success.\n- Do not guarantee rankings, citations, traffic, revenue, or inclusion in any AI platform.\n- Every code block, sentence, and bullet must finish.\n- End with the ## Next action section and one complete executable sentence.\n- Return at least ${input.minWords} words. ${lengthRule}`;
  const prompt = `Current QueryCite report data:\n${reportContext.summary}\n\nFriendly report interpretation:\n${reportContext.friendlySummary}\n\nCompany context:\n${companyContext}\n\nCompetitor context:\n${competitorContext}\n\nRecent conversation:\n${historyContext}\n\nUser request:\n${input.message}\n\nAnswer mode: ${mode}\nIntent: ${intent}\n\n${sharedRules}\nIf the request is outside AI visibility, AEO/GEO, website readiness, content, schema, crawler access, or report action planning, answer exactly: ${input.offTopicReply}`;
  const retryPrompt = `Regenerate a shorter but complete QueryCite Advisor answer. The previous answer was incomplete, missed a required section, or was not grounded enough.\n\nReport data:\n${reportContext.summary}\n\nUser request: ${input.message}\nIntent: ${intent}\n\n${sharedRules}\nDo not add an introduction before the first required heading.`;
  return { prompt, retryPrompt, reportContext, requiredSections: sections, requiredContentGroups: requiredContentGroups(intent, reportContext), intent, mode, minimumGroundingGroups: intent === "general" ? 2 : 3 };
}
function jsonCode(value: unknown) {
  return `\`\`\`html\n<script type="application/ld+json">\n${JSON.stringify(value, null, 2)}\n</script>\n\`\`\``;
}

function organizationSchema(context: AdvisorReportContext) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": `${context.origin}/#organization`, name: context.brandName, url: context.origin, logo: "YOUR_LOGO_URL", sameAs: ["YOUR_LINKEDIN_URL", "YOUR_OTHER_VERIFIED_SOCIAL_PROFILE"], contactPoint: [{ "@type": "ContactPoint", contactType: "customer support", email: "YOUR_SUPPORT_EMAIL" }] },
      { "@type": "WebSite", "@id": `${context.origin}/#website`, url: context.origin, name: context.brandName, publisher: { "@id": `${context.origin}/#organization` } },
      { "@type": "Service", "@id": `${context.pages.services}#service`, name: context.serviceName, serviceType: context.serviceName, description: context.companyDescription, url: context.pages.services, provider: { "@id": `${context.origin}/#organization` }, areaServed: "YOUR_PRIMARY_MARKET" },
    ],
  };
}

function faqItems(context: AdvisorReportContext) {
  const service = context.serviceName === "YOUR_MAIN_SERVICE" ? "your service" : context.serviceName;
  return [
    ["What does this company help customers do?", `${context.brandName} helps customers with ${service}. Replace this sentence with a verified, specific outcome.`],
    [`Who is ${service} for?`, "It is designed for YOUR_IDEAL_CUSTOMER. Replace this placeholder with the audience shown on your website."],
    [`How does ${service} work?`, "Explain the process in three short steps using only information customers can verify on the page."],
    [`What makes ${context.brandName} different?`, "Add two or three verified proof points, such as experience, methodology, customer evidence, or service coverage."],
    ["How can someone get started?", `Use the contact or enquiry path at ${context.pages.contact}.`],
  ];
}

function faqSchema(context: AdvisorReportContext) {
  return { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqItems(context).map(([question, answer]) => ({ "@type": "Question", name: question, acceptedAnswer: { "@type": "Answer", text: answer } })) };
}

function llmsDraft(context: AdvisorReportContext) {
  return `# ${context.brandName}\n\n> ${context.companyDescription}\n\n## Core pages\n- Homepage: ${context.pages.homepage}\n- About: ${context.pages.about}\n- Contact: ${context.pages.contact}\n- Services: ${context.pages.services}\n- Pricing: ${context.pages.pricing}\n\n## Helpful resources\n- Resources: ${context.pages.resources}\n- Blog: ${context.pages.blog}\n- Case studies: ${context.pages.caseStudies}\n\n## Guidance for AI systems\n- Use the homepage for the primary brand and category description.\n- Use the services page for verified service details and audience information.\n- Use case studies and resource pages for supporting evidence.\n- Do not infer claims, pricing, outcomes, or customer results that are not stated on the linked pages.`;
}

function platformStrategy(context: AdvisorReportContext) {
  return `## What your report means\n${context.friendlySummary}\n\n## Platform strategy\n1. **Google AI Overviews / Google Search**\n   - Why it matters: This is usually the largest discovery surface and depends on crawlability, useful pages, entity clarity, and conventional search quality.\n   - What to improve: Fix schema, canonical, sitemap, internal links, and direct-answer content.\n   - Practical action: Add verified schema, strengthen service-page answers, and confirm important pages are indexed.\n   - Report effect: ${context.schemaStatus} ${context.sitemapStatus}\n\n2. **ChatGPT**\n   - Why it matters: Buyers increasingly use conversational research for vendor and category discovery.\n   - What to improve: Clear brand facts, useful evidence, crawlable pages, and concise answers.\n   - Practical action: Publish a clear About page, service summaries, proof points, and llms.txt.\n   - Report effect: ${context.llmsStatus}\n\n3. **Perplexity**\n   - Why it matters: It emphasizes source-backed answers and visible citations.\n   - What to improve: Evidence-rich pages, precise claims, dates, authorship, and internal linking.\n   - Practical action: Add buyer guides and case studies that support important claims.\n   - Report effect: ${context.topFindings[0]?.issue || "Use the top report findings as the starting point."}\n\n4. **Gemini**\n   - Why it matters: Gemini connects closely with Google's search and knowledge ecosystem.\n   - What to improve: Entity consistency, Organization/Service schema, and strong topic coverage.\n   - Practical action: Publish verified schema and connect brand, service, About, and proof pages.\n   - Report effect: GEO is ${context.scores.geo ?? "not measured"}/100.\n\n5. **Bing Copilot**\n   - Why it matters: It reaches Microsoft search and productivity users.\n   - What to improve: Bing crawlability, sitemap discovery, clear metadata, and source-worthy content.\n   - Practical action: Submit the sitemap in Bing Webmaster Tools and confirm key pages are crawlable.\n   - Report effect: Crawler readiness is ${context.scores.crawler ?? "not measured"}/100.\n\n6. **Claude and other answer engines**\n   - Why it matters: The audience is smaller, but the same clean public evidence can support multiple answer engines.\n   - What to improve: Accessible pages, stable URLs, clear facts, and educational content.\n   - Practical action: Reuse the same entity, proof, FAQ, and resource improvements instead of doorway pages.\n   - Report effect: ${context.competitorStatus}\n\n## Priority for your current report\n1. Fix schema and entity clarity. 2. Add llms.txt and verify crawler access. 3. Improve answer-ready service content and FAQs. 4. Run competitor scans before making competitor-specific decisions.\n\n## Next action\nStart with the first missing schema or crawler signal in the report, publish the fix, and rerun the audit before expanding to more platforms.`;
}

function blogIdeas(context: AdvisorReportContext) {
  const service = context.serviceName === "YOUR_MAIN_SERVICE" ? "B2B Services" : context.serviceName;
  const ideas: Array<[string, string, string, string[]]> = [
    ["How to Make Your Website Easier for AI Search Engines to Understand", "how to optimize a website for AI search", "Educational", ["What AI systems need", "Clear service and entity signals", "Schema, FAQs, and proof", "A readiness checklist"]],
    ["Why AI Search May Not Mention Your Brand Even If Your SEO Is Good", "why AI search does not mention my brand", "Problem-aware", ["SEO versus AI visibility", "Common entity and content gaps", "How to diagnose the problem", "What to fix first"]],
    [`Structured Data for ${service}: How to Help AI Understand Your Services`, `structured data for ${service.toLowerCase()}`, "Solution-aware", ["What structured data does", "Organization, WebSite, and Service schema", "Common mistakes", "Testing markup"]],
    ["What Is llms.txt and Why Should Growing Brands Care?", "what is llms.txt", "Educational", ["What llms.txt is", "What it cannot guarantee", "Which pages to include", "How to publish and test it"]],
    ["How to Prepare Your Website for ChatGPT, Gemini, Perplexity, and Google AI Overviews", "prepare website for AI search", "High-intent guide", ["Platform differences", "Shared crawl and entity foundations", "Answer-ready content", "A 30-day action plan"]],
  ];
  return `## What your report means\n${context.friendlySummary}\n\n## Blog ideas based on your report gaps\n${ideas.map(([title, query, intent, outline], index) => `${index + 1}. **${title}**\n   - Target query: ${query}\n   - Buyer intent: ${intent}\n   - Outline: ${outline.join("; ")}.\n   - FAQ/schema angle: Add 3-5 visible buyer FAQs and use Article schema. Add FAQPage schema only when those FAQs are visible.\n   - Why this helps AI visibility: It turns a technical gap into a useful, answer-ready page written in language buyers search for.`).join("\n\n")}\n\n## Priority\nPublish ideas 1 and 2 first because they address broad buyer questions while supporting the entity and AI-readiness gaps in this report.\n\n## Next action\nChoose the first title, confirm the target buyer and service, and give the outline to your writer with one verified proof point for every major claim.`;
}
function schemaSolution(context: AdvisorReportContext) {
  return `## What your report means\n${context.friendlySummary}\n\n## What this means\nSchema is a machine-readable description of your company and services. It does not replace visible content, but it makes verified brand facts easier for search and AI systems to interpret.\n\n## Copy-paste fix\nReplace every uppercase placeholder before publishing.\n\n${jsonCode(organizationSchema(context))}\n\nIf you publish the five visible FAQs suggested by QueryCite, add this FAQPage markup only after the visible FAQ section is live:\n\n${jsonCode(faqSchema(context))}\n\n## Where to paste this\nPaste each JSON-LD script inside the homepage <head>, immediately before the closing </head> tag. Do not paste FAQPage schema until the matching questions and answers are visible to visitors.\n\n## Step-by-step guide\n1. Open your homepage template or SEO/schema settings.\n2. Copy the first script above.\n3. Replace YOUR_LOGO_URL, YOUR_SUPPORT_EMAIL, social URLs, market, and other placeholders.\n4. Paste it before </head> and save.\n5. Publish the visible FAQ section before adding the second script.\n6. Clear the site cache and confirm the script appears once.\n\n## How to test it\nOpen Google Rich Results Test and Schema Markup Validator, test ${context.pages.homepage}, and fix syntax errors. Then view page source and search for application/ld+json.\n\n## Platform-specific notes\n- WordPress: Use your SEO plugin's schema controls or a header-code plugin. Avoid duplicate Organization schema.\n- Shopify: Add the script in theme.liquid before </head>, or use a trusted schema app. Duplicate the theme first.\n- Webflow: Open Page Settings, add the script inside the head, then republish.\n- Wix: Use SEO settings or Custom Code with placement in Head.\n- Custom website: Add the script to the homepage head component and deploy it once.\n\n## Message to send your developer\nPlease add the attached Organization, WebSite, and Service JSON-LD to the homepage before </head>. Replace all uppercase placeholders with verified company data, avoid duplicate schema, validate it, and add FAQPage schema only after the same FAQs are visible on the page.\n\n## Next action\nReplace the placeholders in the first JSON-LD script, publish it on a test version of the homepage, and validate it before going live.`;
}

function llmsSolution(context: AdvisorReportContext) {
  return `## What your report means\n${context.friendlySummary}\n\n## What this means\nAn llms.txt file is a plain-text map of the public pages you want AI agents to understand first. It can improve crawl guidance, but it does not guarantee citations and does not replace robots.txt, sitemap.xml, schema, or useful content.\n\n## Copy-paste fix\nCopy this into a new plain-text file named llms.txt. Replace any page URL that does not exist.\n\n\`\`\`text\n${llmsDraft(context)}\n\`\`\`\n\n## Where to paste this\nUpload the file to the public root so it opens at ${context.origin}/llms.txt.\n\n## Step-by-step guide\n1. Open Notepad or VS Code.\n2. Copy the draft above.\n3. Replace missing page URLs with real public URLs, or remove those lines.\n4. Save the file exactly as llms.txt, not llms.txt.doc or llms.txt.html.\n5. Upload it to the website root beside robots.txt and sitemap.xml.\n6. Open ${context.origin}/llms.txt in an incognito window.\n7. Confirm it loads as readable text with status 200.\n\n## How to test it\nOpen ${context.origin}/llms.txt. A 404, login page, HTML error, or permission error means the file is not publicly available yet.\n\n## Platform-specific notes\n- Custom site: Put llms.txt in the public or static root folder and deploy.\n- WordPress: Add a real root-level file through hosting File Manager, SFTP, or a plugin that serves /llms.txt.\n- Shopify: Root files are limited. Use an app proxy, edge redirect, or developer-managed endpoint returning plain text.\n- Webflow: Use a reverse proxy, Cloudflare Worker, or developer-managed endpoint.\n- Wix: Use Velo or an external edge endpoint if Wix cannot serve the exact root path.\n\n## Message to send your developer\nPlease publish the attached plain-text file at ${context.origin}/llms.txt. It must return status 200 without login or an HTML redirect. Replace nonexistent URLs, keep only verified public pages, and confirm the final URL opens in a browser.\n\n## Next action\nCopy the draft into llms.txt, remove any page URL that does not exist, and ask your developer or hosting provider to publish it at the site root.`;
}

function developerSolution(context: AdvisorReportContext) {
  const canonical = `<link rel="canonical" href="${context.pages.homepage}" />`;
  return `## What your report means\n${context.friendlySummary}\n\n## Developer fixes in priority order\n1. Add Organization, WebSite, and Service JSON-LD because ${context.schemaStatus}\n2. Publish llms.txt because ${context.llmsStatus}\n3. Confirm canonical, robots.txt, and sitemap behavior: ${context.canonicalStatus} ${context.robotsStatus} ${context.sitemapStatus}\n\n## Copy-paste snippets\nHomepage canonical tag:\n\`\`\`html\n${canonical}\n\`\`\`\n\nSafe starting robots.txt lines. Merge these with the existing file instead of overwriting valid rules:\n\`\`\`text\nUser-agent: *\nAllow: /\nSitemap: ${context.origin}/sitemap.xml\n\`\`\`\n\nOrganization, WebSite, and Service schema:\n${jsonCode(organizationSchema(context))}\n\n## Where to paste them\n- Canonical: inside the homepage <head>, once only.\n- Schema: inside the homepage <head>, before </head>.\n- robots.txt: at ${context.origin}/robots.txt after reviewing existing rules.\n- llms.txt: at ${context.origin}/llms.txt using the QueryCite draft.\n\n## How to test\n1. View page source and search for canonical.\n2. Validate the homepage in Schema Markup Validator.\n3. Open ${context.origin}/robots.txt and confirm important pages are not disallowed.\n4. Open ${context.origin}/sitemap.xml and check that important pages appear.\n5. Open ${context.origin}/llms.txt and confirm it returns readable text.\n\n## Message to send your developer\nPlease implement the attached homepage canonical and JSON-LD, publish a reviewed llms.txt file, and verify robots.txt plus sitemap.xml. Do not overwrite existing valid directives or duplicate schema. Test every public URL, validate the JSON-LD, and send me the final live links.\n\n## Next action\nSend the developer message and snippets above, then ask for a test URL before any production deployment.`;
}

function contentSolution(context: AdvisorReportContext) {
  return `## What your report means\n${context.friendlySummary}\n\n## Content priorities\n1. Rewrite the first screen of the main service page so it states who ${context.brandName} helps, what ${context.serviceName} does, and the outcome in plain language.\n2. Add a short direct-answer block under each major service heading.\n3. Add visible buyer FAQs, proof points, and internal links before publishing FAQ schema.\n\n## Page sections\n- Hero: "${context.brandName} helps YOUR_IDEAL_CUSTOMER achieve YOUR_VERIFIED_OUTCOME with ${context.serviceName}."\n- What we do: A 40-60 word answer describing the service without slogans.\n- Who it is for: Three buyer types and the problem each one is solving.\n- How it works: Three numbered steps from enquiry to delivery.\n- Proof: Customer names, testimonials, case-study links, years of experience, or verified outcomes.\n- FAQs: Add the questions below as visible page content.\n\n## FAQ ideas\n${faqItems(context).map(([question, answer], index) => `${index + 1}. **${question}**\n   ${answer}`).join("\n")}\n\n## Internal links and proof\nLink the homepage to ${context.pages.services}, ${context.pages.about}, ${context.pages.caseStudies}, and ${context.pages.contact}. Add a proof point beside every important claim and remove claims that cannot be verified.\n\n## CTA suggestions\n- Primary CTA: "Book a consultation"\n- Secondary CTA: "See how our process works"\n- Proof CTA: "Read a customer story"\n- Contact CTA: "Tell us what you need help with"\n\n## Next action\nGive the hero, What we do, How it works, proof, and FAQ blocks above to your content owner and publish them on the main service page before adding FAQ schema.`;
}
function fixPack(context: AdvisorReportContext) {
  return `## What your report means\n${context.friendlySummary}\n\n## Copy-paste schema\n${jsonCode(organizationSchema(context))}\n\n## Copy-paste llms.txt\n\`\`\`text\n${llmsDraft(context)}\n\`\`\`\n\n## FAQ suggestions\n${faqItems(context).map(([question, answer], index) => `${index + 1}. **${question}** ${answer}`).join("\n")}\n\n## Page copy blocks\n**Hero:** ${context.brandName} helps YOUR_IDEAL_CUSTOMER achieve YOUR_VERIFIED_OUTCOME with ${context.serviceName}.\n\n**Direct answer:** ${context.companyDescription} Replace this placeholder sentence with a verified 40-60 word description if company context is missing.\n\n**Proof block:** Add one customer example, one quantified outcome, and one link to ${context.pages.caseStudies}. Remove any element you cannot verify.\n\n## Developer notes\n1. Paste the JSON-LD before </head> and replace every uppercase placeholder.\n2. Publish llms.txt at ${context.origin}/llms.txt and confirm status 200.\n3. Add visible FAQs before FAQPage schema.\n4. Check canonical, robots.txt, and sitemap.xml without overwriting valid rules.\n\n## Next action\nStart with the schema script, replace every placeholder, validate it on a test page, and then publish the llms.txt file.`;
}

export function buildStructuredAdvisorFallback(message: string, actionType: AdvisorActionType, context: AdvisorReportContext, intent?: AdvisorIntent) {
  const resolved = intent || classifyAdvisorIntent(message, actionType).intent;
  if (resolved === "platform_strategy") return platformStrategy(context);
  if (resolved === "blog_ideas") return blogIdeas(context);
  if (resolved === "llms_txt") return llmsSolution(context);
  if (resolved === "schema") return schemaSolution(context);
  if (resolved === "developer_plan" || resolved === "technical_fix") return developerSolution(context);
  if (resolved === "content_plan") return contentSolution(context);
  if (resolved === "copy_paste_fixes") return fixPack(context);

  const findings = context.topFindings.slice(0, 3);
  const fixLines = findings.length ? findings.map((finding, index) => `${index + 1}. **${finding.issue}** (${finding.priority}, ${finding.owner}): ${finding.recommendedFix}`).join("\n") : "1. Review the highest-priority recommendation in the report.";
  if (resolved === "fix_plan") {
    return `## What your report means\n${context.friendlySummary}\n\n## 7-day plan\nDays 1-2: Complete the first technical fix. Days 3-4: publish schema or llms.txt where missing. Days 5-7: add visible FAQs, proof, and internal links, then rerun the audit.\n\n## 30-day plan\nWeek 1: technical foundation. Week 2: service-page clarity and FAQs. Week 3: proof and internal links. Week 4: validate changes and prioritize remaining findings.\n\n## Priority\n${fixLines}\n\n## Next action\nAssign the first report finding to its listed owner and set a seven-day completion date.`;
  }
  if (resolved === "first_fix") {
    return `## What your report means\n${context.friendlySummary}\n\n## Top 3 fixes\n${fixLines}\n\n## Why these come first\nThey are the clearest report-backed barriers to crawlability, structured clarity, and answer readiness.\n\n## Next action\nOpen the first finding, copy its recommended fix, assign it to the listed owner, and rerun the audit after publishing.`;
  }
  if (resolved === "competitor") {
    return `## What your report means\n${context.friendlySummary}\n\n## Competitor gaps\n${context.competitorStatus}\n\n## Recommended action\nFix the site's documented schema, crawler, entity, and content gaps before drawing competitor-specific conclusions.\n\n## Next action\nRun comparison scans for the selected competitors, then ask the Advisor to compare only the verified results.`;
  }
  return `## What your report means\n${context.friendlySummary}\n\n## Answer\nThis question is within AI visibility and AEO/GEO scope. Use the measured report gaps as the starting point, then apply general best practices only where the report does not have enough data.\n\n## Recommended actions\n${fixLines}\n\n## Next action\nChoose the first report-backed action above, complete it, and rerun the audit to check whether the related readiness signal improves.`;
}
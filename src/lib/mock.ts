export const mockReport = {
  websiteUrl: "https://examplebrand.com/",
  scores: {
    aiVisibility: 64,
    aeo: 58,
    geo: 61,
  },
  topFindings: [
    "The page explains the product, but it does not answer high-intent buyer questions in a direct format.",
    "Entity signals are thin: brand, product category, audience, and proof points need clearer repetition.",
    "Structured data and FAQ coverage are limited, making the page harder for AI systems to parse and cite.",
  ],
  limitedSections: [
    "Basic score breakdown",
    "Top 3 findings",
    "Limited branded PDF download",
    "Basic CSV download",
    "Share locked report option",
    "Email report option",
  ],
  lockedSections: [
    "All findings",
    "Competitor comparison",
    "AI Visibility Advisor",
    "Ready-to-paste fixes",
    "Developer action notes",
    "Full PDF",
    "Full CSV",
    "Full shareable report",
    "Full email report",
  ],
};

export const fullReportPreview = {
  allFindings: [
    "Service and category language should be repeated in the hero, metadata, and answer blocks.",
    "The page needs concise buyer questions with direct answers for AEO readiness.",
    "FAQ schema and organization schema should be added where appropriate.",
    "Trust signals should be grouped near conversion sections and service explanations.",
    "Internal links should connect product, use case, proof, and educational pages more clearly.",
  ],
  competitors: [
    { name: "Competitor A", aiVisibility: 78, gap: "+14", reason: "Clearer category language and stronger proof blocks." },
    { name: "Competitor B", aiVisibility: 72, gap: "+8", reason: "More complete FAQ coverage and structured summaries." },
    { name: "Competitor C", aiVisibility: 69, gap: "+5", reason: "Better internal links between service and use case pages." },
  ],
  advisor: [
    "Rewrite the hero support copy so the brand, product category, audience, and outcome are visible in one concise answer.",
    "Add a buyer FAQ section that answers comparison, pricing, implementation, and proof questions directly.",
    "Group testimonials, client logos, data points, and case examples near the service explanation for stronger trust signals.",
  ],
  fixes: [
    { title: "Hero answer block", copy: "[Brand] helps [audience] solve [problem] with [category], delivering [primary outcome] through [proof point]." },
    { title: "FAQ starter", copy: "What does [Brand] do? [Brand] provides [category] for [audience], helping teams [outcome] with [proof or differentiator]." },
    { title: "Schema direction", copy: "Add Organization, WebSite, FAQPage, and Service schema where the page content supports those entities." },
  ],
  developerNotes: [
    "Add JSON-LD to the page template and validate it before release.",
    "Expose important FAQ copy in crawlable HTML rather than hiding it inside interactive-only elements.",
    "Check that page title, meta description, H1, and first paragraph use consistent entity language.",
  ],
  exportOptions: ["Full PDF report", "Full CSV export", "Full shareable report", "Full email report"],
};

export const integrations = {
  liveNow: ["URL audit form", "Report preview UI", "Contact form UI"],
  betaTesting: ["Shareable report workflow", "Email report workflow", "Agency reporting workspace"],
  comingSoon: ["CMS publishing handoff", "Analytics connector", "Issue tracking handoff"],
};

export const featureCards = [
  ["AI Visibility Score", "See whether your brand, category, and proof points are clear enough for AI search experiences."],
  ["AEO Score", "Find gaps in answer-ready content, FAQs, and direct response structure."],
  ["GEO Score", "Review signals that affect generative search summaries and citation readiness."],
  ["Competitor Comparison", "Preview where competitors may look clearer or more complete to AI systems."],
  ["AI Visibility Advisor", "Get guided next steps for improving entity clarity, trust, and answer coverage."],
  ["Ready-to-paste fixes", "Prepare copy blocks, FAQs, schema, and page updates your team can use."],
  ["Developer notes", "Translate visibility gaps into practical implementation notes."],
  ["PDF/CSV reports", "Package free and full report outputs for internal teams or clients."],
  ["Share and email report", "Prepare stakeholder-friendly delivery options for audit findings."],
];

export const useCases = [
  ["For SaaS Brands", "Find why AI search is not mentioning your product and fix weak citation signals."],
  ["For B2B Service Companies", "Improve answer-ready pages, service positioning, and entity clarity for AI discovery."],
  ["For Agencies", "Run AI visibility audits for clients and export branded reports."],
  ["For SEO Teams", "Move beyond keyword rankings into answer readiness, citation readiness, and AI search visibility."],
  ["For Content Teams", "Turn AEO/GEO gaps into clear content briefs and ready-to-paste improvements."],
  ["For Founders", "Understand whether AI engines can clearly explain what your company does and why it matters."],
];

export const resources = [
  ["Blog", "Editorial updates and practical notes about AI visibility work.", "Coming Soon"],
  ["AEO/GEO Guides", "Plain-English guides for answer readiness and generative search visibility.", "Coming Soon"],
  ["AI Search Glossary", "Definitions for the terms teams need when discussing AI search readiness.", "Coming Soon"],
  ["SEO vs AEO vs GEO", "A static explainer for how these disciplines differ and overlap.", "Available"],
  ["Templates", "Reusable briefs, report outlines, and fix-planning templates.", "Coming Soon"],
  ["Launch Notes", "Product and roadmap notes for QueryCite.", "Available"],
];

export const faqs = [
  ["What is QueryCite?", "QueryCite is an AI Visibility Audit and AEO/GEO fix generator that helps brands understand why AI search may not cite or recommend them."],
  ["Does QueryCite guarantee AI citations?", "No. QueryCite does not guarantee citations, rankings, traffic, or revenue. It helps identify visibility gaps and generate practical fixes that improve AI search readiness."],
  ["What is AEO?", "AEO means Answer Engine Optimization. It helps your content become easier for answer engines to understand, summarize, and use."],
  ["What is GEO?", "GEO means Generative Engine Optimization. It focuses on making your brand, content, and website more discoverable and citation-ready for generative AI search experiences."],
  ["Who is QueryCite for?", "QueryCite is for SaaS brands, B2B companies, agencies, SEO teams, content teams, and founders."],
  ["What do I get in the free report?", "The free report includes basic AI Visibility, AEO/GEO scores, top findings, and limited export options."],
  ["What is unlocked in the full report?", "The full report unlocks all findings, competitor comparison, AI Visibility Advisor, ready-to-paste fixes, developer notes, full PDF/CSV exports, and full shareable report."],
  ["Are integrations live?", "Only integrations clearly marked as Live Now should be treated as available. Beta Testing and Coming Soon items are roadmap indicators only."],
];

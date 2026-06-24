import type { AdvisorActionType } from "@/lib/plans";

type UnknownRecord = Record<string, unknown>;

type GroundedFinding = {
  issue: string;
  recommendedFix: string;
  priority: string;
  owner: string;
};

export type AdvisorReportContext = {
  websiteUrl: string;
  scores: {
    aiVisibility: number | null;
    aeo: number | null;
    geo: number | null;
    crawler: number | null;
  };
  schemaStatus: string;
  llmsStatus: string;
  competitorStatus: string;
  topFindings: GroundedFinding[];
  developerNotes: string[];
  summary: string;
  groundingGroups: string[][];
};

function asRecord(value: unknown): UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as UnknownRecord : {};
}

function cleanText(value: unknown, maxLength = 320) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function numberValue(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return Math.round(value);
  }
  return null;
}

function scoreLine(label: string, value: number | null) {
  return `${label}: ${value === null ? "Not available" : `${value}/100`}`;
}

function extractFindings(report: UnknownRecord) {
  const findings = Array.isArray(report.findings) ? report.findings : Array.isArray(report.topIssues) ? report.topIssues : [];
  return findings.slice(0, 5).map((value): GroundedFinding => {
    if (typeof value === "string") {
      return { issue: cleanText(value), recommendedFix: "Review the matching recommendation in the report.", priority: "Medium", owner: "Marketing" };
    }
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
  const supplied = Array.isArray(competitorData)
    ? competitorData.length
    : Object.keys(asRecord(competitorData)).length;
  const reportCompetitor = asRecord(report.competitorSummary ?? report.competitor_summary);
  const reportKeys = Object.keys(reportCompetitor).length;

  if (supplied > 0 || reportKeys > 0) {
    return "Competitor data is available; use only the supplied comparison signals and identify explicit gaps.";
  }
  return "No scored competitor comparison is available for this report. Do not invent competitor strengths or scores.";
}

export function buildAdvisorReportContext(currentReportData: unknown, competitorData: unknown): AdvisorReportContext {
  const report = asRecord(currentReportData);
  const scores = asRecord(report.scores);
  const structured = asRecord(report.structuredDataSummary ?? report.structured_data_summary);
  const checks = asRecord(report.checks);
  const structuredCheck = asRecord(checks.structuredData ?? checks.structured_data);
  const organizationCheck = asRecord(checks.organizationSchema ?? checks.organization_schema);
  const llms = asRecord(report.llmsTxt ?? report.llms_txt);
  const findings = extractFindings(report);
  const developerNotes = (Array.isArray(report.developerNotes) ? report.developerNotes : Array.isArray(report.developer_notes) ? report.developer_notes : [])
    .map((note) => cleanText(note))
    .filter(Boolean)
    .slice(0, 5);

  const context: Omit<AdvisorReportContext, "summary" | "groundingGroups"> = {
    websiteUrl: cleanText(report.finalUrl ?? report.final_url ?? report.websiteUrl ?? report.website_url, 240) || "Current audited website",
    scores: {
      aiVisibility: numberValue(scores.aiVisibility, report.aiVisibilityScore, report.ai_visibility_score, report.overallAiVisibilityScore),
      aeo: numberValue(scores.aeoReadiness, report.aeoScore, report.aeo_score),
      geo: numberValue(scores.geoReadiness, report.geoScore, report.geo_score),
      crawler: numberValue(scores.aiCrawlerReadiness, report.aiCrawlerReadinessScore, report.ai_crawler_readiness_score),
    },
    schemaStatus: typeof structured.schemaCount === "number"
      ? `${structured.schemaCount} schema item${structured.schemaCount === 1 ? "" : "s"} detected; Organization schema: ${structured.hasOrganizationSchema ? "found" : "missing"}; FAQ schema: ${structured.hasFaqSchema ? "found" : "missing"}; Article schema: ${structured.hasArticleSchema ? "found" : "missing"}.`
      : cleanText(structuredCheck.detail ?? organizationCheck.detail) || "Schema status is not available in the saved report.",
    llmsStatus: Object.keys(llms).length
      ? `llms.txt: ${llms.found ? "found" : "missing"}. ${cleanText(llms.detail) || "No additional llms.txt detail."}`
      : "llms.txt status is not available in the saved report.",
    competitorStatus: extractCompetitorStatus(report, competitorData),
    topFindings: findings,
    developerNotes,
  };

  const findingLines = context.topFindings.length
    ? context.topFindings.map((finding, index) => `${index + 1}. [${finding.priority}] ${finding.issue} | Fix: ${finding.recommendedFix} | Owner: ${finding.owner}`).join("\n")
    : "No findings were included in the saved report context.";
  const developerLines = context.developerNotes.length ? context.developerNotes.map((note, index) => `${index + 1}. ${note}`).join("\n") : "No separate developer notes were included.";

  const summary = `Website: ${context.websiteUrl}
${scoreLine("AI Visibility Score", context.scores.aiVisibility)}
${scoreLine("AEO Score", context.scores.aeo)}
${scoreLine("GEO Score", context.scores.geo)}
${scoreLine("AI Crawler Readiness Score", context.scores.crawler)}
Schema status: ${context.schemaStatus}
llms.txt status: ${context.llmsStatus}
Competitor gap status: ${context.competitorStatus}
Top findings:
${findingLines}
Developer notes:
${developerLines}`;

  const scoreGroups = Object.values(context.scores)
    .filter((score): score is number => score !== null)
    .map((score) => [`${score}/100`]);
  const findingGroups = context.topFindings.slice(0, 2).map((finding) => {
    const words = finding.issue.split(/\s+/).slice(0, 6).join(" ");
    return [finding.issue, words];
  });
  const schemaGroup = [context.schemaStatus, "schema item", structured.hasOrganizationSchema ? "organization schema found" : "organization schema missing"];
  const llmsGroup = [context.llmsStatus, llms.found ? "llms.txt found" : "llms.txt missing", llms.found ? "found llms.txt" : "missing llms.txt"];
  const competitorGroup = context.competitorStatus.startsWith("No scored")
    ? [context.competitorStatus, "no scored competitor", "competitor comparison is not available"]
    : [context.competitorStatus, "competitor data is available", "supplied competitor data"];

  return {
    ...context,
    summary,
    groundingGroups: [...scoreGroups, schemaGroup, llmsGroup, competitorGroup, ...findingGroups],
  };
}

export function advisorRequiredSections(message: string, actionType: AdvisorActionType) {
  const normalized = message.toLowerCase();

  if (normalized.includes("developer action notes") || normalized.includes("developer notes")) {
    return ["Report signal summary", "Developer action notes", "Why it matters for AI visibility", "Priority", "Next action"];
  }
  if (normalized.includes("aeo/geo fix plan") || (normalized.includes("7-day") && normalized.includes("30-day"))) {
    return ["Report signal summary", "7-day plan", "30-day plan", "Priority", "Next action"];
  }
  if (normalized.includes("what should i fix first")) {
    return ["Report signal summary", "Top 3 fixes", "Why it matters for AI visibility", "Priority", "Next action"];
  }
  if (actionType === "blog_brief") {
    return ["Report signal summary", "5 blog ideas", "Priority", "Next action"];
  }
  if (actionType === "competitor_advice") {
    return ["Report signal summary", "Competitor gaps", "Recommended action", "Priority", "Next action"];
  }
  if (actionType === "fix_pack") {
    return ["Report signal summary", "Recommended fixes", "Implementation notes", "Priority", "Next action"];
  }
  return ["Report signal summary", "Why it matters for AI visibility", "Recommended fix", "Priority", "Next action"];
}

function actionRequirements(message: string, actionType: AdvisorActionType) {
  const normalized = message.toLowerCase();

  if (normalized.includes("developer action notes") || normalized.includes("developer notes")) {
    return "List report-backed developer actions. For each include the issue, technical fix, implementation note, owner, and priority.";
  }
  if (normalized.includes("aeo/geo fix plan")) {
    return "Create both a 7-day plan and a 30-day plan. Assign actions to marketing, content, or developer owners and tie each action to a report signal.";
  }
  if (normalized.includes("what should i fix first")) {
    return "Return the top 3 fixes in priority order. For each include the report evidence, effort, impact, owner, and first implementation step.";
  }
  if (actionType === "blog_brief") {
    return "Return exactly 5 report-grounded blog ideas with target query, buyer intent, outline, FAQ/schema angle, and AEO/GEO value.";
  }
  if (actionType === "competitor_advice") {
    return "Use only supplied competitor data. If no scored comparison exists, say so and focus on the site's documented readiness gaps.";
  }
  if (actionType === "fix_pack") {
    return "Return a fix pack with issue, report evidence, exact recommendation, effort, expected impact, implementation note, owner, and priority.";
  }
  return "Answer the report-specific question with practical next steps for marketing, content, and developer teams.";
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
  const reportContext = buildAdvisorReportContext(input.currentReportData, input.competitorData);
  const requiredSections = advisorRequiredSections(input.message, input.actionType);
  const headings = requiredSections.map((section) => `## ${section}`).join("\n");
  const requirements = actionRequirements(input.message, input.actionType);
  const companyContext = JSON.stringify(input.companyProfile || {}).slice(0, 1_800);
  const competitorContext = JSON.stringify(input.competitorData || {}).slice(0, 2_400);
  const historyContext = JSON.stringify(input.chatHistory || []).slice(0, 3_000);

  const sharedRules = `Use these exact markdown headings, in this order:
${headings}

Rules:
- In the Report signal summary, state every available AI Visibility, AEO, GEO, and AI Crawler Readiness score, plus schema status, llms.txt status, competitor gap status, and the leading report findings.
- Explain why the recommendations follow from those signals. Do not give generic advice disconnected from the report.
- ${requirements}
- Do not invent competitor scores or missing report facts.
- Do not guarantee citations, rankings, traffic, revenue, or search positions.
- Write complete sentences. Never end with a fragment, dangling bullet, colon, conjunction, or preposition.
- End with the ## Next action section and one complete, executable final sentence.
- Return at least ${input.minWords} words. Prefer 180-420 words for chat and up to 650 words for plans or fix packs.`;

  const prompt = `Current QueryCite report signals, which are the source of truth:
${reportContext.summary}

Company profile context:
${companyContext}

Supplied competitor context:
${competitorContext}

Recent chat history:
${historyContext}

User request:
${input.message}

${sharedRules}
- If the request is unrelated, answer exactly: ${input.offTopicReply}`;

  const retryPrompt = `Regenerate a shorter but complete QueryCite Advisor answer. The previous response was incomplete, missing sections, or insufficiently grounded.

Report signals:
${reportContext.summary}

User request: ${input.message}

${sharedRules}
Do not add an introduction before the first required heading.`;

  return { prompt, retryPrompt, reportContext, requiredSections };
}

function scoreSummary(context: AdvisorReportContext) {
  return [
    scoreLine("AI Visibility Score", context.scores.aiVisibility),
    scoreLine("AEO Score", context.scores.aeo),
    scoreLine("GEO Score", context.scores.geo),
    scoreLine("AI Crawler Readiness Score", context.scores.crawler),
  ].join("; ");
}

function topFixLines(context: AdvisorReportContext, count = 3) {
  const findings = context.topFindings.slice(0, count);
  if (!findings.length) {
    return ["1. Review the highest-priority finding in the report and assign it to the relevant owner."];
  }
  return findings.map((finding, index) => `${index + 1}. **${finding.issue}** (${finding.priority}, ${finding.owner}): ${finding.recommendedFix}`);
}

export function buildStructuredAdvisorFallback(message: string, actionType: AdvisorActionType, context: AdvisorReportContext) {
  const normalized = message.toLowerCase();
  const firstFinding = context.topFindings[0];
  const firstFix = firstFinding?.recommendedFix || "Implement the highest-priority recommendation in the report.";
  const fallbackFindingSummary = context.topFindings.slice(0, 2).map((finding) => finding.issue).join("; ") || "No findings were included.";
  const signals = `${scoreSummary(context)} Schema: ${context.schemaStatus} ${context.llmsStatus} Competitor gap status: ${context.competitorStatus} Leading findings: ${fallbackFindingSummary}`;

  if (normalized.includes("developer action notes") || normalized.includes("developer notes")) {
    const notes = context.developerNotes.length
      ? context.developerNotes.map((note, index) => `${index + 1}. ${note}`).join("\n")
      : topFixLines(context).join("\n");
    return `## Report signal summary
${signals}

## Developer action notes
${notes}

## Why it matters for AI visibility
The report shows which technical signals are missing or weak. Schema, crawler guidance, and llms.txt should be corrected before broader content expansion because they affect how clearly machines can access and interpret the site.

## Priority
High. Start with the first missing technical signal named above, then validate every implementation against visible page content.

## Next action
Assign the first technical fix to the developer, publish it in a test environment, validate it, and rerun the QueryCite audit.`;
  }

  if (normalized.includes("aeo/geo fix plan")) {
    return `## Report signal summary
${signals}

## 7-day plan
1. Days 1-2: Fix the highest-priority finding: ${firstFinding?.issue || "the first report finding"}.
2. Days 3-4: Implement this report-backed recommendation: ${firstFix}
3. Days 5-7: Review schema, llms.txt, crawler access, and answer-ready page structure, then validate the changes.

## 30-day plan
Week 1: Complete the technical fixes and rerun the audit. Week 2: strengthen direct answers and buyer FAQs. Week 3: add proof, internal links, and structured data supported by visible content. Week 4: review score movement and prioritize the remaining findings.

## Priority
High for missing crawler, schema, or llms.txt signals; Medium for content expansion after the technical baseline is complete.

## Next action
Create owners and due dates for the first seven-day tasks, beginning with the highest-priority report finding.`;
  }

  if (normalized.includes("what should i fix first")) {
    return `## Report signal summary
${signals}

## Top 3 fixes
${topFixLines(context).join("\n")}

## Why it matters for AI visibility
These fixes come directly from the report's weakest signals and should improve crawlability, structured clarity, and answer readiness before lower-priority content expansion.

## Priority
Work from the first item downward, completing High-priority technical issues before Medium- or Low-priority enhancements.

## Next action
Assign the first fix to its listed owner, publish the change, and rerun the audit before starting the second fix.`;
  }

  if (actionType === "competitor_advice") {
    return `## Report signal summary
${signals}

## Competitor gaps
${context.competitorStatus} The current site should first address its documented gaps: ${context.topFindings.map((finding) => finding.issue).slice(0, 3).join("; ") || "the highest-priority report findings"}.

## Recommended action
${topFixLines(context).join("\n")}

## Priority
High for the first report-backed technical gap. Do not assign competitor scores until competitor audits are available.

## Next action
Complete the first site fix, then add verified competitor audit data before drawing comparative conclusions.`;
  }

  if (actionType === "blog_brief") {
    const topics = context.topFindings.length ? context.topFindings : [{ issue: "AI visibility readiness", recommendedFix: firstFix, priority: "Medium", owner: "Content" }];
    const ideas = Array.from({ length: 5 }, (_, index) => {
      const finding = topics[index % topics.length];
      return `${index + 1}. **${finding.issue}**: Target a buyer question connected to this gap, answer it directly, add a short FAQ where useful, and link the article to the relevant product or service page.`;
    }).join("\n");
    return `## Report signal summary
${signals}

## 5 blog ideas
${ideas}

## Priority
Start with the topic tied to the highest-priority finding, then cover the remaining gaps in report order.

## Next action
Turn the first idea into a brief with a verified buyer query, a direct answer, supporting proof, and relevant internal links.`;
  }

  if (actionType === "fix_pack") {
    return `## Report signal summary
${signals}

## Recommended fixes
${topFixLines(context).join("\n")}

## Implementation notes
Apply each fix only where visible page content supports it, validate schema after deployment, and rerun the audit after the first high-priority change.

## Priority
Complete High-priority crawler, schema, and llms.txt work before lower-priority content expansion.

## Next action
Assign the first fix to its listed owner, set a due date, and validate the published result before moving to the next item.`;
  }

  const genericRecommendations = topFixLines(context).join("\n");
  return `## Report signal summary
${signals}

## Why it matters for AI visibility
The report indicates that the site's weakest documented signals may make it harder for AI and search systems to access, understand, and summarize the brand consistently.

## Recommended fix
${genericRecommendations}

## Priority
Start with the highest-priority report finding, especially when it affects crawler access, schema clarity, or llms.txt guidance.

## Next action
Implement this report-backed fix: ${firstFix} Then rerun the audit and compare the affected readiness score before expanding the work.`;
}
export type ScoreName =
  | "aiVisibility"
  | "aeoReadiness"
  | "geoReadiness"
  | "aiCrawlerReadiness"
  | "citationReadiness"
  | "contentReadiness"
  | "technicalReadiness";

export type FindingPriority = "High" | "Medium" | "Low";
export type FindingOwner = "Marketing" | "Content" | "Developer";
export type CrawlerAccessStatus = "Allowed" | "Blocked" | "Not mentioned" | "Needs review";

export type AuditFinding = {
  issue: string;
  whyItMatters: string;
  priority: FindingPriority;
  recommendedFix: string;
  owner: FindingOwner;
};

export type AuditCheck = {
  label: string;
  passed: boolean;
  detail: string;
};

export type ScoreExplanation = {
  helped: string[];
  hurt: string[];
  fixFirst: string[];
};

export type CrawlerAccessResult = {
  bot: string;
  status: CrawlerAccessStatus;
  ruleSource: "direct" | "wildcard" | "none" | "missing robots";
  detail: string;
  important: boolean;
};

export type LlmsTxtResult = {
  url: string;
  found: boolean;
  statusCode: number;
  contentLength: number;
  hasUsefulReferences: boolean;
  isEmptyOrThin: boolean;
  detail: string;
};

export type WebsiteAuditReport = {
  reportVersion: "website-readiness-v1";
  reportId?: string;
  auditId?: string | null;
  websiteUrl: string;
  finalUrl: string;
  scannedAt: string;
  fetchStatus: number;
  pageTitle: string;
  metaDescription: string;
  h1s: string[];
  h2s: string[];
  scores: Record<ScoreName, number>;
  scoreExplanations: Record<ScoreName, ScoreExplanation>;
  checks: Record<string, AuditCheck>;
  findings: AuditFinding[];
  fixes: AuditFinding[];
  developerNotes: string[];
  fullRecommendations: string[];
  crawlerReadiness: {
    robotsTxtUrl: string;
    robotsFound: boolean;
    robotsStatusCode: number;
    score: number;
    botResults: CrawlerAccessResult[];
    note: string;
  };
  llmsTxt: LlmsTxtResult;
  discoveredPages: {
    homepage: string;
    aboutUrl: string | null;
    contactUrl: string | null;
    resourcesUrl: string | null;
    importantInternalLinks: string[];
  };
  structuredDataSummary: {
    schemaCount: number;
    schemaTypes: string[];
    hasOrganizationSchema: boolean;
    hasFaqSchema: boolean;
    hasArticleSchema: boolean;
  };
  contentSummary: {
    internalLinkCount: number;
    answerStyleSignals: number;
    faqLikeSignals: number;
    trustSignalCount: number;
  };
};

export type AuditApiResponse = {
  report: WebsiteAuditReport;
};

export const auditStorageKey = "querycite.latestAuditReport";

export function isWebsiteAuditReport(value: unknown): value is WebsiteAuditReport {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<WebsiteAuditReport>;
  return Boolean(
    candidate.reportVersion === "website-readiness-v1" &&
    candidate.finalUrl &&
    candidate.scores &&
    typeof candidate.scores.aiCrawlerReadiness === "number" &&
    candidate.crawlerReadiness &&
    candidate.llmsTxt &&
    candidate.discoveredPages,
  );
}
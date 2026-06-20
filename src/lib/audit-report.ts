export type ScoreName =
  | "aiVisibility"
  | "aeoReadiness"
  | "geoReadiness"
  | "citationReadiness"
  | "contentReadiness"
  | "technicalReadiness";

export type FindingPriority = "High" | "Medium" | "Low";
export type FindingOwner = "Marketing" | "Content" | "Developer";

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

export type WebsiteAuditReport = {
  reportVersion: "website-readiness-v1";
  websiteUrl: string;
  finalUrl: string;
  scannedAt: string;
  fetchStatus: number;
  pageTitle: string;
  metaDescription: string;
  h1s: string[];
  h2s: string[];
  scores: Record<ScoreName, number>;
  checks: Record<string, AuditCheck>;
  findings: AuditFinding[];
  fixes: AuditFinding[];
  developerNotes: string[];
  fullRecommendations: string[];
  structuredDataSummary: {
    schemaCount: number;
    schemaTypes: string[];
    hasOrganizationSchema: boolean;
    hasFaqSchema: boolean;
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
  return candidate.reportVersion === "website-readiness-v1" && Boolean(candidate.finalUrl) && Boolean(candidate.scores);
}

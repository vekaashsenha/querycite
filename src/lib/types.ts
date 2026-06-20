export type ScoreKey =
  | "overallAiVisibilityScore"
  | "aeoScore"
  | "geoScore"
  | "entityClarityScore"
  | "faqCoverageScore"
  | "structuredDataScore"
  | "trustSignalScore";

export type AuditReport = {
  overallAiVisibilityScore: number;
  aeoScore: number;
  geoScore: number;
  entityClarityScore: number;
  faqCoverageScore: number;
  structuredDataScore: number;
  trustSignalScore: number;
  topIssues: string[];
  detailedRecommendations: string[];
  faqSuggestions: Array<{
    question: string;
    answer: string;
  }>;
  schemaJsonLdSuggestion: Record<string, unknown>;
  thirtyDayActionPlan: Array<{
    dayRange: string;
    action: string;
    outcome: string;
  }>;
};

export type ScrapedPage = {
  url: string;
  title: string;
  metaDescription: string;
  headings: Array<{
    level: string;
    text: string;
  }>;
  bodyText: string;
  links: Array<{
    text: string;
    href: string;
  }>;
  schemaMarkup: string[];
};

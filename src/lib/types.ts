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
  faqSuggestions: Array<{ question: string; answer: string }>;
  schemaJsonLdSuggestion: Record<string, unknown>;
  thirtyDayActionPlan: Array<{ dayRange: string; action: string; outcome: string }>;
};

export type ScrapedPage = {
  url: string;
  title: string;
  metaDescription: string;
  headings: Array<{ level: string; text: string }>;
  bodyText: string;
  links: Array<{ text: string; href: string }>;
  schemaMarkup: string[];
};

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  company_profile_id: string | null;
  onboarding_status: string;
  created_at: string;
  updated_at: string;
};

export type CompanyProfile = {
  id: string;
  owner_user_id: string;
  company_name: string | null;
  primary_domain: string;
  website_url: string;
  industry: string | null;
  business_type: string | null;
  primary_market: string | null;
  company_description: string | null;
  primary_product_service: string | null;
  icp_customer_type: string | null;
  positioning_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompetitorType = "Direct" | "Indirect" | "Aspirational";

export type Competitor = {
  id: string;
  company_profile_id: string;
  user_id: string;
  competitor_name: string | null;
  competitor_url: string;
  domain: string;
  competitor_type: CompetitorType;
  slot_number: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Audit = {
  id: string;
  user_id: string | null;
  company_profile_id: string | null;
  website_url: string;
  normalized_url: string;
  final_url: string | null;
  audit_type: "free" | "beta_full_preview" | "paid_full" | "agency";
  status: "queued" | "running" | "completed" | "failed";
  source: string | null;
  request_payload: Record<string, unknown> | null;
  scraped_snapshot: Record<string, unknown> | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type FindingPriority = "High" | "Medium" | "Low";
export type FindingOwner = "Marketing" | "Content" | "Developer";

export type Finding = {
  issue: string;
  whyItMatters: string;
  priority: FindingPriority;
  recommendedFix: string;
  owner: FindingOwner;
};

export type Fix = Finding;

export type Report = {
  id: string;
  audit_id: string;
  user_id: string | null;
  company_profile_id: string | null;
  website_url: string;
  final_url: string | null;
  report_type: "free" | "beta_full_preview" | "paid_full" | "agency";
  ai_visibility_score: number | null;
  aeo_score: number | null;
  geo_score: number | null;
  ai_crawler_readiness_score: number | null;
  citation_readiness_score: number | null;
  content_readiness_score: number | null;
  technical_readiness_score: number | null;
  findings: Finding[];
  fixes: Fix[];
  developer_notes: string[];
  competitor_summary: Record<string, unknown> | null;
  advisor_context: Record<string, unknown> | null;
  full_report_data: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type AdvisorMessage = {
  id: string;
  user_id: string;
  company_profile_id: string | null;
  report_id: string | null;
  role: "user" | "assistant" | "system";
  message: string;
  model: string | null;
  tokens_estimate: number | null;
  raw_event: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type AdvisorPlanType = "free" | "launchTrial" | "starter" | "pro" | "agency" | "privateBeta" | "betaFullReport";

export const advisorCreditLimits: Record<AdvisorPlanType, number> = {
  free: 0,
  launchTrial: 30,
  starter: 50,
  pro: 200,
  agency: 500,
  privateBeta: 50,
  betaFullReport: 50,
};

export type AdvisorCreditUsage = {
  id: string;
  user_id: string;
  company_profile_id: string | null;
  plan_name: string;
  period_start: string;
  period_end: string;
  credits_limit: number;
  credits_used: number;
  reset_date: string;
  created_at: string;
  updated_at: string;
};

export type Feedback = {
  id: string;
  user_id: string | null;
  name: string | null;
  work_email: string;
  company: string | null;
  website_url: string | null;
  feedback_type: string;
  message: string;
  source_page: string | null;
  status: "new" | "received" | "email_failed" | "resolved";
  resend_email_id: string | null;
  created_at: string;
  updated_at: string;
};


export type Lead = {
  id: string;
  full_name: string;
  email: string;
  company_name: string | null;
  role: string | null;
  website_url: string;
  audit_url: string | null;
  source: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  privacy_terms_accepted: boolean;
  marketing_consent: boolean;
  consent_timestamp: string;
  user_agent: string | null;
  created_at: string;
  updated_at: string;
};
export type Export = {
  id: string;
  user_id: string | null;
  report_id: string;
  export_type: "limited_pdf" | "full_pdf" | "basic_csv" | "full_csv" | "share_link" | "email_report";
  status: "queued" | "ready" | "failed" | "preview";
  storage_bucket: string | null;
  storage_path: string | null;
  public_url: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  company_profile_id: string | null;
  email: string | null;
  plan_name: string;
  status: string;
  provider: "razorpay" | "placeholder";
  product: string;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  paid_access: boolean;
  website_url: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  renewal_date: string | null;
  next_billing_date: string | null;
  cancel_at_period_end: boolean;
  failed_payment_count: number;
  raw_event: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  provider: "razorpay" | "placeholder";
  product: string;
  email: string | null;
  provider_payment_id: string | null;
  provider_invoice_id: string | null;
  razorpay_customer_id: string | null;
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  amount: number | null;
  amount_cents: number | null;
  currency: string;
  status: string;
  event_payload: Record<string, unknown>;
  raw_event: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};
export type EmailEvent = {
  id: string;
  recipient_email: string;
  email_type: string;
  subject: string;
  status: string;
  provider_message_id: string | null;
  error_message: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  created_at: string;
};
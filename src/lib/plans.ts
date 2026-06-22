export type PaidPlanName = "free" | "starter" | "pro" | "agency" | "launchTrial" | "betaFullReport" | "adminQa";
export type AdvisorActionType = "chat" | "blog_brief" | "fix_pack" | "competitor_advice";

export type PlanLimits = {
  advisorCredits: number;
  blogBriefs: number;
  fixPacks: number;
  competitorAdvice: number;
  competitors: number;
  competitorChanges: number;
};

export const planLimits: Record<PaidPlanName, PlanLimits> = {
  free: { advisorCredits: 0, blogBriefs: 0, fixPacks: 0, competitorAdvice: 0, competitors: 0, competitorChanges: 0 },
  launchTrial: { advisorCredits: 30, blogBriefs: 2, fixPacks: 10, competitorAdvice: 3, competitors: 3, competitorChanges: 3 },
  starter: { advisorCredits: 50, blogBriefs: 2, fixPacks: 10, competitorAdvice: 3, competitors: 3, competitorChanges: 3 },
  pro: { advisorCredits: 200, blogBriefs: 8, fixPacks: 40, competitorAdvice: 5, competitors: 5, competitorChanges: 3 },
  agency: { advisorCredits: 500, blogBriefs: 20, fixPacks: 100, competitorAdvice: 10, competitors: 10, competitorChanges: 3 },
  betaFullReport: { advisorCredits: 50, blogBriefs: 2, fixPacks: 10, competitorAdvice: 3, competitors: 3, competitorChanges: 3 },
  adminQa: { advisorCredits: 1000, blogBriefs: 100, fixPacks: 100, competitorAdvice: 100, competitors: 10, competitorChanges: 100 },
};

export const advisorActionCosts: Record<AdvisorActionType, { credits: number; blogBriefs: number; fixPacks: number; competitorAdvice: number }> = {
  chat: { credits: 1, blogBriefs: 0, fixPacks: 0, competitorAdvice: 0 },
  blog_brief: { credits: 5, blogBriefs: 1, fixPacks: 0, competitorAdvice: 0 },
  fix_pack: { credits: 5, blogBriefs: 0, fixPacks: 1, competitorAdvice: 0 },
  competitor_advice: { credits: 3, blogBriefs: 0, fixPacks: 0, competitorAdvice: 1 },
};

export function normalizePaidPlanName(value: string | null | undefined): PaidPlanName {
  const plan = (value || "free").toLowerCase();
  if (plan.includes("agency")) return "agency";
  if (plan.includes("pro")) return "pro";
  if (plan.includes("admin") || plan.includes("qa")) return "adminQa";
  if (plan.includes("beta")) return "betaFullReport";
  if (plan.includes("trial") || plan.includes("launch")) return "launchTrial";
  if (plan.includes("starter") || plan.includes("full")) return "starter";
  return "free";
}
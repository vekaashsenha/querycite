import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";
import { AdvisorGenerationError, generateAdvisorWithResilience } from "@/lib/advisor-provider";
import { buildAdvisorPrompts, buildStructuredAdvisorFallback } from "@/lib/advisor-context";
import { getGeminiModelSequence } from "@/lib/gemini";
import { advisorActionCosts, normalizePaidPlanName, planLimits, type AdvisorActionType, type PaidPlanName } from "@/lib/plans";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { insertSupabaseRow, isSupabaseAdminConfigured, selectSupabaseRows, updateSupabaseRows } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ADVISOR_GEMINI_MODEL = getGeminiModelSequence("advisor")[0];
const MAX_MESSAGE_LENGTH = 900;
const MAX_HISTORY_ITEMS = 8;
const MIN_ADVISOR_WORDS = 80;
const offTopicReply = "I can help with AI visibility, AEO/GEO, website readiness, content, schema, crawler access, and report action planning. Please ask me something in that area.";
const normalUserErrorCopy = "AI Visibility Advisor is temporarily busy. Your report and recommended fixes are still available.";

const systemInstruction = `You are QueryCite AI Visibility Advisor, a dependable implementation buddy for founders, small business owners, freelancer marketers, and non-technical growth teams. Answer flexible questions about AI visibility, AEO, GEO, AI search platforms, SEO basics connected to AI visibility, content, entity clarity, schema, llms.txt, robots.txt, canonical tags, sitemaps, crawlability, competitors, and implementation. Use current report data where available, then relevant best practices, and clearly state when data is missing. Generate actual copy-paste fixes and beginner-friendly steps whenever possible. Do not guarantee AI citations, rankings, traffic, revenue, or inclusion in any platform. Refuse black-hat SEO, spam tactics, scraping bypasses, competitor defamation, and medical, legal, or financial advice.`;

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type RawChatMessage = {
  role?: "user" | "assistant";
  content?: unknown;
};

type AdvisorChatRequest = {
  message?: string;
  currentReportData?: unknown;
  companyProfile?: unknown;
  competitorData?: unknown;
  planType?: string;
  actionType?: AdvisorActionType;
  subscriptionId?: string | null;
  reportId?: string | null;
  chatHistory?: RawChatMessage[];
};

type AdvisorErrorCode =
  | "missing_key"
  | "timeout"
  | "quota"
  | "invalid_key"
  | "model_error"
  | "empty_response"
  | "incomplete_response"
  | "provider_error"
  | "backend_error";

type AdvisorAccessState = "admin" | "paid" | "free";

type AdvisorDiagnostics = {
  status: "ready" | "error";
  geminiKey: "configured" | "missing";
  reportContext: "found" | "missing";
  accessState: AdvisorAccessState;
  lastError: AdvisorErrorCode | null;
  providerStatus: number | null;
  retryCount: number;
  responseLength: number;
  responseComplete: boolean;
  finishReason: string | null;
  modelUsed: string;
  finalFailureReason: string | null;
};

type UsageRow = Record<string, unknown> & {
  id?: string;
  advisor_credits_used?: number | null;
  blog_briefs_used?: number | null;
  fix_packs_used?: number | null;
  competitor_advice_used?: number | null;
};

const allowedPlanTypes = new Set(["betaFullReport", "adminQa", "launchTrial", "starter", "pro", "agency"]);

function compactText(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim();
}

function truncateText(value: unknown, maxLength = MAX_MESSAGE_LENGTH) {
  return compactText(value).slice(0, maxLength);
}

function sanitizeHistory(history: unknown): ChatMessage[] {
  if (!Array.isArray(history)) return [];

  return history
    .filter((item): item is RawChatMessage => typeof item === "object" && item !== null)
    .slice(-MAX_HISTORY_ITEMS)
    .map((item): ChatMessage => ({
      role: item.role === "assistant" ? "assistant" : "user",
      content: truncateText(item.content, 900),
    }))
    .filter((item) => item.content.length > 0);
}

function isReportDataPresent(value: unknown) {
  return typeof value === "object" && value !== null && Object.keys(value).length > 0;
}

function isBlockedOrUnrelated(message: string) {
  const normalized = message.toLowerCase();
  const unsafePatterns = [
    /\b(medical advice|legal advice|financial advice|diagnose|lawsuit|investment advice)\b/,
    /\b(black hat|black-hat|spam backlinks|keyword stuffing|cloaking|parasite seo|negative seo)\b/,
    /\b(defame|smear|fake review|scrape private|bypass robots|bypass paywall)\b/,
  ];
  const relevantPatterns = [
    /\b(ai visibility|ai search|aeo|geo|citation|cite|answer engine|search engine|seo|rank|ranking|traffic)\b/,
    /\b(chatgpt|gemini|perplexity|ai overview|bing copilot|claude|copilot)\b/,
    /\b(schema|structured data|llms|robots|canonical|sitemap|crawl|crawler|metadata|internal link)\b/,
    /\b(content|blog|faq|entity|brand clarity|competitor|developer|website|report|fix|action plan)\b/,
  ];
  const clearlyUnrelated = /\b(recipe|cook|movie|song|poem|joke|weather|sports|stock|crypto|dating|travel itinerary|math homework|translate this)\b/;

  if (unsafePatterns.some((pattern) => pattern.test(normalized))) return true;
  if (relevantPatterns.some((pattern) => pattern.test(normalized))) return false;
  return clearlyUnrelated.test(normalized);
}
function sanitizeForbiddenClaims(reply: string) {
  return reply
    .replace(/guaranteed\s+AI\s+ranking/gi, "improved AI visibility readiness")
    .replace(/guaranteed\s+ChatGPT\s+citation/gi, "improved citation-readiness")
    .replace(/guaranteed\s+traffic/gi, "stronger readiness signals")
    .replace(/guaranteed\s+revenue/gi, "clearer next-step signals")
    .replace(/guaranteed\s+search\s+position/gi, "stronger search readiness");
}

function diagnosticState(input: Partial<AdvisorDiagnostics> & Pick<AdvisorDiagnostics, "accessState">): AdvisorDiagnostics {
  return {
    status: input.status ?? "ready",
    geminiKey: process.env.GEMINI_API_KEY ? "configured" : "missing",
    reportContext: input.reportContext ?? "found",
    accessState: input.accessState,
    lastError: input.lastError ?? null,
    providerStatus: input.providerStatus ?? null,
    retryCount: input.retryCount ?? 0,
    responseLength: input.responseLength ?? 0,
    responseComplete: input.responseComplete ?? false,
    finishReason: input.finishReason ?? null,
    modelUsed: input.modelUsed ?? ADVISOR_GEMINI_MODEL,
    finalFailureReason: input.finalFailureReason ?? null,
  };
}

function serializeDiagnostics(diagnostics: AdvisorDiagnostics) {
  return {
    ...diagnostics,
    response_complete: diagnostics.responseComplete,
    response_length: diagnostics.responseLength,
    finish_reason: diagnostics.finishReason,
    model_used: diagnostics.modelUsed,
    retries_used: diagnostics.retryCount,
  };
}

function structuredError(code: AdvisorErrorCode, status: number, diagnosticMessage: string, retryable: boolean, diagnostics?: AdvisorDiagnostics) {
  return NextResponse.json(
    {
      error: {
        code,
        message: normalUserErrorCopy,
        retryable,
      },
      ...(diagnostics ? { diagnostics: serializeDiagnostics({ ...diagnostics, status: "error", lastError: code }), diagnosticMessage } : {}),
    },
    { status },
  );
}

function usageAllows(row: UsageRow | null, planName: PaidPlanName, actionType: AdvisorActionType) {
  const limits = planLimits[planName];
  const cost = advisorActionCosts[actionType];
  const creditsUsed = row?.advisor_credits_used ?? 0;
  const blogBriefsUsed = row?.blog_briefs_used ?? 0;
  const fixPacksUsed = row?.fix_packs_used ?? 0;
  const competitorAdviceUsed = row?.competitor_advice_used ?? 0;

  return {
    allowed: creditsUsed + cost.credits <= limits.advisorCredits && blogBriefsUsed + cost.blogBriefs <= limits.blogBriefs && fixPacksUsed + cost.fixPacks <= limits.fixPacks && competitorAdviceUsed + cost.competitorAdvice <= limits.competitorAdvice,
    usage: { creditsUsed, blogBriefsUsed, fixPacksUsed, competitorAdviceUsed },
    limits,
    cost,
  };
}

function exhaustedFeature(row: UsageRow | null, planName: PaidPlanName, actionType: AdvisorActionType) {
  const check = usageAllows(row, planName, actionType);
  if (check.usage.blogBriefsUsed + check.cost.blogBriefs > check.limits.blogBriefs) return "blog brief";
  if (check.usage.fixPacksUsed + check.cost.fixPacks > check.limits.fixPacks) return "fix pack";
  if (check.usage.competitorAdviceUsed + check.cost.competitorAdvice > check.limits.competitorAdvice) return "competitor guidance";
  return "AI Advisor";
}

function formatAccessDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

async function getUsage(subscriptionId: string, userId: string, planName: PaidPlanName, periodStart: string, periodEnd: string, email: string | null, reportId: string | null) {
  if (!isSupabaseAdminConfigured()) return null;
  const rows = await selectSupabaseRows<UsageRow>("advisor_credit_usage", {
    select: "*",
    subscription_id: `eq.${subscriptionId}`,
    period_start: `eq.${periodStart}`,
    limit: "1",
  });
  const existing = rows[0];
  if (existing) return existing;

  const limits = planLimits[planName];
  const inserted = await insertSupabaseRow("advisor_credit_usage", {
    user_id: userId,
    subscription_id: subscriptionId,
    email,
    report_id: reportId,
    plan_name: planName,
    period_start: periodStart,
    period_end: periodEnd,
    credits_limit: limits.advisorCredits,
    credits_used: 0,
    advisor_credits_limit: limits.advisorCredits,
    advisor_credits_used: 0,
    blog_briefs_limit: limits.blogBriefs,
    blog_briefs_used: 0,
    fix_packs_limit: limits.fixPacks,
    fix_packs_used: 0,
    competitor_advice_limit: limits.competitorAdvice,
    competitor_advice_used: 0,
    reset_date: periodEnd,
    created_at: new Date().toISOString(),
  });
  return inserted[0] as UsageRow;
}

async function incrementUsage(row: UsageRow | null, actionType: AdvisorActionType) {
  if (!row?.id || !isSupabaseAdminConfigured()) return null;
  const current = usageAllows(row, normalizePaidPlanName(String(row.plan_name || "starter")), actionType);
  const next = {
    credits_used: current.usage.creditsUsed + current.cost.credits,
    advisor_credits_used: current.usage.creditsUsed + current.cost.credits,
    blog_briefs_used: current.usage.blogBriefsUsed + current.cost.blogBriefs,
    fix_packs_used: current.usage.fixPacksUsed + current.cost.fixPacks,
    competitor_advice_used: current.usage.competitorAdviceUsed + current.cost.competitorAdvice,
    updated_at: new Date().toISOString(),
  };
  const updated = await updateSupabaseRows("advisor_credit_usage", { id: `eq.${row.id}` }, next);
  return updated[0] as UsageRow;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  await syncAuthenticatedUser(user);
  const access = await getPaidAccessContextForUser(user);
  if (!access.qaAccess && (!access.verifiedPaidAccess || !access.subscriptionId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const planName = access.qaAccess ? "adminQa" : access.planName;
  const periodStart = access.currentPeriodStart || access.accessStartsAt || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const periodEnd = access.currentPeriodEnd || access.accessEndsAt || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
  const usageRow = access.qaAccess || !access.subscriptionId
    ? null
    : await getUsage(access.subscriptionId, user.id, planName, periodStart, periodEnd, access.email ?? user.email, null);
  const usage = usageRow ? {
    creditsUsed: usageRow.advisor_credits_used ?? usageRow.credits_used ?? 0,
    blogBriefsUsed: usageRow.blog_briefs_used ?? 0,
    fixPacksUsed: usageRow.fix_packs_used ?? 0,
    competitorAdviceUsed: usageRow.competitor_advice_used ?? 0,
  } : { creditsUsed: 0, blogBriefsUsed: 0, fixPacksUsed: 0, competitorAdviceUsed: 0 };

  return NextResponse.json({
    usage,
    limits: planLimits[planName],
    resetDate: periodEnd,
    ...(access.qaAccess ? {
      diagnostics: serializeDiagnostics(diagnosticState({
        accessState: "admin",
        reportContext: "missing",
      })),
    } : {}),
  });
}

export async function POST(request: Request) {
  let adminDiagnostics: AdvisorDiagnostics | undefined;

  try {
    const body = (await request.json()) as AdvisorChatRequest;
    const message = compactText(body.message);
    const actionType: AdvisorActionType = body.actionType === "blog_brief" || body.actionType === "fix_pack" || body.actionType === "competitor_advice" ? body.actionType : "chat";
    const requestedPlan = normalizePaidPlanName(body.planType);

    if (!message) {
      return NextResponse.json({ error: "Enter a question for AI Advisor." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Question is too long. Please shorten it and try again." }, { status: 400 });
    }

    if (!allowedPlanTypes.has(requestedPlan)) {
      return NextResponse.json({ error: "AI Advisor is not available for this report mode." }, { status: 403 });
    }

    if (!isReportDataPresent(body.currentReportData)) {
      return NextResponse.json({ error: "Run an audit first to activate AI Advisor." }, { status: 400 });
    }

    if (isBlockedOrUnrelated(message)) {
      return NextResponse.json({ reply: offTopicReply, blocked: true });
    }

    let planName = requestedPlan;
    let usageRow: UsageRow | null = null;
    let resetDate: string | null = null;
    let isAdminQa = false;

    if (requestedPlan !== "betaFullReport") {
      const user = await getCurrentUser();
      if (!user) {
        return NextResponse.json({ error: "Please log in to use AI Advisor." }, { status: 401 });
      }
      await syncAuthenticatedUser(user);
      const access = await getPaidAccessContextForUser(user);
      if (access.qaAccess) {
        isAdminQa = true;
        planName = "adminQa";
        resetDate = access.currentPeriodEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
        adminDiagnostics = diagnosticState({ accessState: "admin", reportContext: "found" });
      } else {
        if (!access.verifiedPaidAccess || !access.subscriptionId) {
          return NextResponse.json({ error: "AI Advisor requires verified paid access." }, { status: 403 });
        }
        planName = access.planName;
        const periodStart = access.currentPeriodStart || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
        const periodEnd = access.currentPeriodEnd || new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString();
        resetDate = periodEnd;
        usageRow = await getUsage(access.subscriptionId, user.id, planName, periodStart, periodEnd, access.email ?? user.email, body.reportId || null);
        const check = usageAllows(usageRow, planName, actionType);
        if (!check.allowed) {
          const feature = exhaustedFeature(usageRow, planName, actionType);
          return NextResponse.json({
            error: `You have used this period's limit for ${feature}. Your paid access remains active until ${formatAccessDate(periodEnd)}.`,
            usage: check.usage,
            limits: check.limits,
            resetDate,
          }, { status: 429 });
        }
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return structuredError(
        "missing_key",
        503,
        "GEMINI_API_KEY is missing from the server environment.",
        false,
        adminDiagnostics,
      );
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const promptContext = buildAdvisorPrompts({
      message,
      currentReportData: body.currentReportData,
      companyProfile: body.companyProfile,
      competitorData: body.competitorData,
      chatHistory: sanitizeHistory(body.chatHistory),
      actionType,
      offTopicReply,
      minWords: MIN_ADVISOR_WORDS,
    });
    const generation = await generateAdvisorWithResilience({
      ai,
      prompt: promptContext.prompt,
      retryPrompt: promptContext.retryPrompt,
      actionType,
      systemInstruction,
      minWords: MIN_ADVISOR_WORDS,
      requiredSections: promptContext.requiredSections,
      groundingGroups: promptContext.reportContext.groundingGroups,
      minimumGroundingGroups: promptContext.minimumGroundingGroups,
      requiredContentGroups: promptContext.requiredContentGroups,
      answerMode: promptContext.mode,
      structuredFallback: () => buildStructuredAdvisorFallback(message, actionType, promptContext.reportContext, promptContext.intent),
    });
    const reply = sanitizeForbiddenClaims(generation.reply);

    const updatedUsage = requestedPlan === "betaFullReport" || isAdminQa ? null : await incrementUsage(usageRow, actionType);
    const usagePlan = planLimits[planName];
    const usage = updatedUsage ? {
      creditsUsed: updatedUsage.advisor_credits_used ?? updatedUsage.credits_used ?? 0,
      blogBriefsUsed: updatedUsage.blog_briefs_used ?? 0,
      fixPacksUsed: updatedUsage.fix_packs_used ?? 0,
      competitorAdviceUsed: updatedUsage.competitor_advice_used ?? 0,
    } : null;
    const diagnostics = isAdminQa
      ? diagnosticState({
          accessState: "admin",
          reportContext: "found",
          lastError: generation.finalFailure?.code ?? null,
          providerStatus: generation.finalFailure?.status ?? null,
          retryCount: generation.retryCount,
          responseLength: generation.responseLength,
          responseComplete: generation.responseComplete,
          finishReason: generation.finishReason,
          modelUsed: generation.modelUsed,
          finalFailureReason: generation.finalFailure?.message ?? null,
        })
      : undefined;

    return NextResponse.json({
      reply,
      model: generation.modelUsed,
      usage,
      limits: usagePlan,
      resetDate,
      ...(diagnostics ? { diagnostics: serializeDiagnostics(diagnostics) } : {}),
    });
  } catch (error) {
    if (error instanceof AdvisorGenerationError) {
      const diagnostics = adminDiagnostics
        ? diagnosticState({
            ...adminDiagnostics,
            status: "error",
            lastError: error.failure.code,
            providerStatus: error.failure.status,
            retryCount: error.retryCount,
            responseLength: error.responseLength,
            responseComplete: false,
            finishReason: error.finishReason,
            modelUsed: error.modelUsed,
            finalFailureReason: error.failure.message,
          })
        : undefined;
      return structuredError(error.failure.code, error.failure.status, error.failure.message, error.failure.retryable, diagnostics);
    }

    console.error("AI Advisor route failed", {
      model: ADVISOR_GEMINI_MODEL,
      finalStatus: "backend_error",
    });
    return structuredError("backend_error", 500, "Unexpected Advisor backend error.", true, adminDiagnostics);
  }
}

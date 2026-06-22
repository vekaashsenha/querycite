import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getPaidAccessContextForUser } from "@/lib/paid-foundation";
import { getGeminiModel } from "@/lib/gemini";
import { advisorActionCosts, normalizePaidPlanName, planLimits, type AdvisorActionType, type PaidPlanName } from "@/lib/plans";
import { getCurrentUser, syncAuthenticatedUser } from "@/lib/auth/server";
import { insertSupabaseRow, isSupabaseAdminConfigured, selectSupabaseRows, updateSupabaseRows } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const ADVISOR_GEMINI_MODEL = getGeminiModel("advisor");
const MAX_MESSAGE_LENGTH = 900;
const MAX_HISTORY_ITEMS = 8;
const offTopicReply = "I can only help with this AI Visibility Report, AEO/GEO fixes, competitor gaps, content improvements, developer notes, and next steps.";

const systemInstruction = `You are QueryCite AI Visibility Advisor. You help users understand and act on their current AI Visibility Audit report. Only answer using the current report data, saved company profile context, saved competitor data, and related AEO/GEO best practices. Do not answer unrelated questions. Do not guarantee AI citations, rankings, traffic, revenue, or search positions. Give practical next steps for marketing, content, and developer teams. Refuse black-hat SEO, spam tactics, scraping bypasses, competitor defamation, and medical, legal, or financial advice.`;

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
  const blockedPatterns = [
    /\b(guarantee|guaranteed)\b.*\b(chatgpt|ai|citation|ranking|traffic|revenue|position)\b/,
    /\b(medical advice|legal advice|financial advice|diagnose|lawsuit|investment advice)\b/,
    /\b(black hat|black-hat|spam backlinks|keyword stuffing|cloaking|parasite seo|negative seo)\b/,
    /\b(defame|smear|fake review|scrape private|bypass robots|bypass paywall)\b/,
  ];
  const unrelatedPatterns = [
    /\b(recipe|cook|movie|song|poem|joke|weather|sports|stock|crypto|dating|travel itinerary)\b/,
    /\b(write code|debug my code|math homework|translate this)\b/,
    /\bwho is|what is the capital|current news\b/,
  ];
  const reportPatterns = [
    /\b(ai visibility|visibility|score|report|aeo|geo|citation|cite|competitor|content|schema|metadata|developer|internal link|faq|fix|action plan|pdf|csv|share|email|next step|ranking|traffic|search|crawler|llms)\b/,
    /\bwhat should i|where should i|why is|how do i improve|7-day|30-day\b/,
  ];

  if (blockedPatterns.some((pattern) => pattern.test(normalized))) return true;
  return unrelatedPatterns.some((pattern) => pattern.test(normalized)) && !reportPatterns.some((pattern) => pattern.test(normalized));
}

function actionInstruction(actionType: AdvisorActionType) {
  if (actionType === "blog_brief") {
    return "Return a blog/content brief with title, target query, buyer intent, suggested structure, FAQ section, schema recommendation, internal linking suggestion, and AEO/GEO angle.";
  }
  if (actionType === "fix_pack") {
    return "Return a fix pack with issue, why it matters, exact recommendation, effort level, expected impact, developer note, and priority.";
  }
  if (actionType === "competitor_advice") {
    return "Compare the user site with saved competitors only if competitor data is present. Return competitor gaps, priority recommendations, and do not defame competitors.";
  }
  return "Answer the report-specific question with concise practical next steps.";
}

function buildAdvisorPrompt(message: string, currentReportData: unknown, chatHistory: ChatMessage[], companyProfile: unknown, competitorData: unknown, actionType: AdvisorActionType) {
  return `Current report data, which you must use as the source of truth:\n${JSON.stringify(currentReportData, null, 2)}\n\nCompany profile context:\n${JSON.stringify(companyProfile || {}, null, 2)}\n\nCompetitor comparison data:\n${JSON.stringify(competitorData || {}, null, 2)}\n\nRecent chat history:\n${JSON.stringify(chatHistory, null, 2)}\n\nUser question:\n${message}\n\nAction mode:\n${actionInstruction(actionType)}\n\nResponse rules:\n- Answer only about this report, saved reports, company profile, AEO/GEO readiness, citation readiness, competitor gaps, content fixes, developer notes, schema/metadata/internal linking, exports, or 7-day/30-day next steps.\n- If the question is unrelated, answer exactly: ${offTopicReply}\n- Do not guarantee AI citations, rankings, traffic, revenue, or search positions.\n- Use phrases like improve AI visibility readiness, citation-readiness, crawlability, structured clarity, and increase likelihood of being understood by AI/search systems.\n- Keep the response concise, practical, and specific to the report context.\n- Prefer bullets or short sections for clarity.\n- Target 140-220 words.`;
}

function sanitizeForbiddenClaims(reply: string) {
  return reply
    .replace(/guaranteed\\s+AI\\s+ranking/gi, "improved AI visibility readiness")
    .replace(/guaranteed\\s+ChatGPT\\s+citation/gi, "improved citation-readiness")
    .replace(/guaranteed\\s+traffic/gi, "stronger readiness signals")
    .replace(/guaranteed\\s+revenue/gi, "clearer next-step signals")
    .replace(/guaranteed\\s+search\\s+position/gi, "stronger search readiness");
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

export async function POST(request: Request) {
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
          return NextResponse.json({ error: "You have used all Advisor credits for this billing period.", usage: check.usage, limits: check.limits, resetDate }, { status: 429 });
        }
      }
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI Advisor is unavailable because Gemini is not configured, but your audit report is still available." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: ADVISOR_GEMINI_MODEL,
      contents: buildAdvisorPrompt(message, body.currentReportData, sanitizeHistory(body.chatHistory), body.companyProfile, body.competitorData, actionType),
      config: {
        temperature: 0.25,
        maxOutputTokens: actionType === "chat" ? 620 : 820,
        systemInstruction,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      throw new Error("Gemini returned an empty advisor response.");
    }

    const updatedUsage = requestedPlan === "betaFullReport" || isAdminQa ? null : await incrementUsage(usageRow, actionType);
    const usagePlan = planLimits[planName];
    const usage = updatedUsage ? {
      creditsUsed: updatedUsage.advisor_credits_used ?? updatedUsage.credits_used ?? 0,
      blogBriefsUsed: updatedUsage.blog_briefs_used ?? 0,
      fixPacksUsed: updatedUsage.fix_packs_used ?? 0,
      competitorAdviceUsed: updatedUsage.competitor_advice_used ?? 0,
    } : null;

    return NextResponse.json({ reply: sanitizeForbiddenClaims(reply), model: ADVISOR_GEMINI_MODEL, usage, limits: usagePlan, resetDate });
  } catch (error) {
    console.error("AI Advisor chat failed", error);
    return NextResponse.json({ error: "AI Advisor could not respond right now. Please try again." }, { status: 500 });
  }
}
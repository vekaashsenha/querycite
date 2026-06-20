import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { getGeminiModel } from "@/lib/gemini";

export const runtime = "nodejs";

const ADVISOR_GEMINI_MODEL = getGeminiModel("advisor");
const MAX_MESSAGE_LENGTH = 700;
const MAX_HISTORY_ITEMS = 8;
const offTopicReply = "I can only help with this AI Visibility Report, AEO/GEO fixes, competitor gaps, content improvements, developer notes, and next steps.";

const systemInstruction = `You are QueryCite AI Visibility Advisor. You help users understand and act on their current AI Visibility Audit report. Only answer using the current report data and related AEO/GEO best practices. Do not answer unrelated questions. Do not guarantee AI citations, rankings, traffic, or revenue. Give practical next steps for marketing, content, and developer teams.`;

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
  planType?: string;
  chatHistory?: RawChatMessage[];
};

const allowedPlanTypes = new Set(["betaFullReport", "launchTrial", "starter", "pro", "agency"]);

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

function isClearlyUnrelated(message: string) {
  const normalized = message.toLowerCase();
  const unrelatedPatterns = [
    /\b(recipe|cook|movie|song|poem|joke|weather|sports|stock|crypto|dating|travel itinerary)\b/,
    /\b(write code|debug my code|math homework|translate this)\b/,
    /\bwho is|what is the capital|current news\b/,
  ];

  const reportPatterns = [
    /\b(ai visibility|visibility|score|report|aeo|geo|citation|cite|competitor|content|schema|metadata|developer|internal link|faq|fix|action plan|pdf|csv|share|email|next step|ranking|traffic|search)\b/,
    /\bwhat should i|where should i|why is|how do i improve|7-day|30-day\b/,
  ];

  return unrelatedPatterns.some((pattern) => pattern.test(normalized)) && !reportPatterns.some((pattern) => pattern.test(normalized));
}

function buildAdvisorPrompt(message: string, currentReportData: unknown, chatHistory: ChatMessage[]) {
  return `Current report data, which you must use as the source of truth:\n${JSON.stringify(currentReportData, null, 2)}\n\nRecent chat history:\n${JSON.stringify(chatHistory, null, 2)}\n\nUser question:\n${message}\n\nResponse rules:\n- Answer only about this report, AEO/GEO readiness, citation readiness, competitor gaps, content fixes, developer notes, schema/metadata/internal linking, exports, or 7-day/30-day next steps.\n- If the question is unrelated, answer exactly: ${offTopicReply}\n- Keep the response concise, practical, and specific to the report context.\n- Do not guarantee AI citations, rankings, traffic, or revenue.\n- Prefer bullets or short sections for clarity.\n- Target 120-180 words.`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AdvisorChatRequest;
    const message = compactText(body.message);

    if (!message) {
      return NextResponse.json({ error: "Enter a question for AI Advisor." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Question is too long. Please shorten it and try again." }, { status: 400 });
    }

    if (!allowedPlanTypes.has(body.planType ?? "free")) {
      return NextResponse.json({ error: "AI Advisor is not available for this report mode." }, { status: 403 });
    }

    if (!isReportDataPresent(body.currentReportData)) {
      return NextResponse.json({ error: "Current report data is required." }, { status: 400 });
    }

    if (isClearlyUnrelated(message)) {
      return NextResponse.json({ reply: offTopicReply, blocked: true });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "AI Advisor is unavailable because Gemini is not configured, but your audit report is still available." }, { status: 500 });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: ADVISOR_GEMINI_MODEL,
      contents: buildAdvisorPrompt(message, body.currentReportData, sanitizeHistory(body.chatHistory)),
      config: {
        temperature: 0.25,
        maxOutputTokens: 520,
        systemInstruction,
      },
    });

    const reply = response.text?.trim();
    if (!reply) {
      throw new Error("Gemini returned an empty advisor response.");
    }

    return NextResponse.json({ reply, model: ADVISOR_GEMINI_MODEL });
  } catch (error) {
    console.error("AI Advisor chat failed", error);
    return NextResponse.json({ error: "AI Advisor could not respond right now. Please try again." }, { status: 500 });
  }
}

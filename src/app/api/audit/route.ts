import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { scrapePage } from "@/lib/scrape";
import type { AuditReport } from "@/lib/types";

export const runtime = "nodejs";

type AuditRequest = {
  url?: string;
};

const reportJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "overallAiVisibilityScore",
    "aeoScore",
    "geoScore",
    "entityClarityScore",
    "faqCoverageScore",
    "structuredDataScore",
    "trustSignalScore",
    "topIssues",
    "detailedRecommendations",
    "faqSuggestions",
    "schemaJsonLdSuggestion",
    "thirtyDayActionPlan",
  ],
  properties: {
    overallAiVisibilityScore: { type: "number", minimum: 0, maximum: 100 },
    aeoScore: { type: "number", minimum: 0, maximum: 100 },
    geoScore: { type: "number", minimum: 0, maximum: 100 },
    entityClarityScore: { type: "number", minimum: 0, maximum: 100 },
    faqCoverageScore: { type: "number", minimum: 0, maximum: 100 },
    structuredDataScore: { type: "number", minimum: 0, maximum: 100 },
    trustSignalScore: { type: "number", minimum: 0, maximum: 100 },
    topIssues: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: { type: "string" },
    },
    detailedRecommendations: {
      type: "array",
      minItems: 5,
      maxItems: 8,
      items: { type: "string" },
    },
    faqSuggestions: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["question", "answer"],
        properties: {
          question: { type: "string" },
          answer: { type: "string" },
        },
      },
    },
    schemaJsonLdSuggestion: {
      type: "object",
      additionalProperties: true,
    },
    thirtyDayActionPlan: {
      type: "array",
      minItems: 4,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["dayRange", "action", "outcome"],
        properties: {
          dayRange: { type: "string" },
          action: { type: "string" },
          outcome: { type: "string" },
        },
      },
    },
  },
} as const;

function clampScore(score: unknown) {
  const numeric = typeof score === "number" ? score : Number(score);
  if (Number.isNaN(numeric)) return 0;
  return Math.max(0, Math.min(100, Math.round(numeric)));
}

function normalizeReport(report: AuditReport): AuditReport {
  return {
    ...report,
    overallAiVisibilityScore: clampScore(report.overallAiVisibilityScore),
    aeoScore: clampScore(report.aeoScore),
    geoScore: clampScore(report.geoScore),
    entityClarityScore: clampScore(report.entityClarityScore),
    faqCoverageScore: clampScore(report.faqCoverageScore),
    structuredDataScore: clampScore(report.structuredDataScore),
    trustSignalScore: clampScore(report.trustSignalScore),
    topIssues: report.topIssues.slice(0, 3),
  };
}

function cleanGeminiJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fenced?.[1]) return fenced[1].trim();

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }

  return trimmed;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AuditRequest;

    if (!body.url?.trim()) {
      return NextResponse.json({ error: "Enter a website URL to audit." }, { status: 400 });
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing. Add it to .env.local and restart the app." },
        { status: 500 },
      );
    }

    const scrapedPage = await scrapePage(body.url);
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

        

        const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
      contents: `
You are an AI visibility auditor.

Analyze this website page and return ONLY valid JSON matching the required schema.

Website data:
${JSON.stringify(scrapedPage, null, 2)}
`,
      config: {
        temperature: 0.2,
        responseMimeType: "application/json",
        responseSchema: reportJsonSchema,
      },
    });

    const geminiText = response.text;
    if (!geminiText) {
      throw new Error("Gemini returned an empty report.");
    }

    const auditReport = normalizeReport(
      JSON.parse(cleanGeminiJson(geminiText)) as AuditReport
    );

    return NextResponse.json({ report: auditReport, scrapedPage });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
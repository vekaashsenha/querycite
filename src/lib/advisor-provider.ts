import { ApiError, FinishReason, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { getGeminiModelSequence } from "@/lib/gemini";
import type { AdvisorActionType } from "@/lib/plans";

const ADVISOR_MODELS = getGeminiModelSequence("advisor");
const ADVISOR_TIMEOUT_MS = 30_000;
const MAX_PROVIDER_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [550, 1_100];

export type AdvisorProviderErrorCode =
  | "timeout"
  | "quota"
  | "invalid_key"
  | "model_error"
  | "empty_response"
  | "incomplete_response"
  | "provider_error"
  | "backend_error";

export type AdvisorProviderFailure = {
  code: AdvisorProviderErrorCode;
  status: number;
  message: string;
  retryable: boolean;
};

export type AdvisorGenerationResult = {
  reply: string;
  modelUsed: string;
  retryCount: number;
  responseLength: number;
  responseComplete: boolean;
  finishReason: string | null;
  usedStructuredFallback: boolean;
  finalFailure: AdvisorProviderFailure | null;
};

type GenerationAttempt = {
  reply: string;
  finishReason: string | null;
  finishMessage: string | null;
};

type CompletenessResult = {
  complete: boolean;
  reasons: string[];
};

export class AdvisorGenerationError extends Error {
  failure: AdvisorProviderFailure;
  modelUsed: string;
  retryCount: number;
  responseLength: number;
  finishReason: string | null;

  constructor(failure: AdvisorProviderFailure, modelUsed: string, retryCount: number, responseLength: number, finishReason: string | null) {
    super(failure.message);
    this.name = "AdvisorGenerationError";
    this.failure = failure;
    this.modelUsed = modelUsed;
    this.retryCount = retryCount;
    this.responseLength = responseLength;
    this.finishReason = finishReason;
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeForMatch(value: string) {
  return value
    .toLowerCase()
    .replace(/[*_#:`]/g, " ")
    .replace(/[^a-z0-9./\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasCompleteEnding(reply: string) {
  const lines = reply.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const lastLine = lines.at(-1)?.replace(/[*_`]+$/g, "").trim() ?? "";
  if (!lastLine || !/[.!?)]$/.test(lastLine)) return false;

  const withoutPunctuation = lastLine.replace(/[.!?)]$/, "").trim().toLowerCase();
  const incompleteTail = /\b(the|a|an|to|of|for|with|and|or|but|by|at|in|on|from|into|your|their|this|that|these|those|is|are|be|as)$/;
  return !incompleteTail.test(withoutPunctuation);
}

function responseCompleteness(input: {
  attempt: GenerationAttempt;
  minWords: number;
  requiredSections: string[];
  groundingGroups: string[][];
}) {
  const reasons: string[] = [];
  const normalizedReply = normalizeForMatch(input.attempt.reply);
  const naturalFinish = !input.attempt.finishReason || input.attempt.finishReason === FinishReason.STOP;

  if (!input.attempt.reply) reasons.push("empty response");
  if (wordCount(input.attempt.reply) < input.minWords) reasons.push(`under ${input.minWords} words`);
  if (!naturalFinish) reasons.push(`finish reason ${input.attempt.finishReason}`);
  if (!hasCompleteEnding(input.attempt.reply)) reasons.push("incomplete final sentence");

  const missingSections = input.requiredSections.filter((section) => !normalizedReply.includes(normalizeForMatch(section)));
  if (missingSections.length) reasons.push(`missing sections: ${missingSections.join(", ")}`);

  const normalizedGroundingGroups = input.groundingGroups
    .map((group) => [...new Set(group.map(normalizeForMatch).filter((term) => term.length >= 3))])
    .filter((group) => group.length > 0);
  const groundingMatches = normalizedGroundingGroups.filter((group) => group.some((term) => normalizedReply.includes(term))).length;
  const requiredGroundingMatches = normalizedGroundingGroups.length;
  if (groundingMatches < requiredGroundingMatches) {
    reasons.push(`incomplete report grounding (${groundingMatches}/${requiredGroundingMatches} signal groups)`);
  }

  return { complete: reasons.length === 0, reasons } satisfies CompletenessResult;
}

function modelForAttempt(attemptIndex: number) {
  if (attemptIndex < 2 || ADVISOR_MODELS.length === 1) return ADVISOR_MODELS[0];
  return ADVISOR_MODELS[1];
}

function classifyProviderError(error: unknown, model: string): AdvisorProviderFailure {
  let status = 0;
  if (error instanceof ApiError) {
    status = error.status;
  } else if (typeof error === "object" && error !== null && "status" in error) {
    const possibleStatus = (error as { status?: unknown }).status;
    status = typeof possibleStatus === "number" ? possibleStatus : 0;
  }

  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("timeout") || normalized.includes("timed out") || normalized.includes("abort")) {
    return { code: "timeout", status: 504, message: "Provider request timed out.", retryable: true };
  }
  if (status === 429 || normalized.includes("quota") || normalized.includes("resource_exhausted")) {
    return { code: "quota", status: 503, message: "Provider quota or rate limit was reached.", retryable: true };
  }
  if (status === 401 || status === 403 || normalized.includes("api key") || normalized.includes("permission_denied")) {
    return { code: "invalid_key", status: 503, message: "Provider rejected the configured API key.", retryable: false };
  }
  if (status === 404 || (normalized.includes("model") && normalized.includes("not found"))) {
    return { code: "model_error", status: 503, message: `Model ${model} is unavailable.`, retryable: false };
  }
  if (status >= 500 || error instanceof ApiError) {
    return { code: "provider_error", status: 503, message: `Provider returned ${status || "an upstream error"}.`, retryable: true };
  }
  return { code: "backend_error", status: 500, message: "Unexpected Advisor backend error.", retryable: true };
}

async function withTimeout<T>(operation: Promise<T>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Advisor provider timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function generateAttempt(input: {
  ai: GoogleGenAI;
  prompt: string;
  actionType: AdvisorActionType;
  model: string;
  systemInstruction: string;
}) {
  const operation = input.ai.models.generateContent({
    model: input.model,
    contents: input.prompt,
    config: {
      temperature: 0.2,
      maxOutputTokens: input.actionType === "chat" ? 3_200 : 5_000,
      systemInstruction: input.systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      httpOptions: { timeout: ADVISOR_TIMEOUT_MS },
    },
  });
  const response = await withTimeout(operation, ADVISOR_TIMEOUT_MS + 1_000);
  const candidate = response.candidates?.[0];

  return {
    reply: response.text?.trim() ?? "",
    finishReason: candidate?.finishReason ?? null,
    finishMessage: candidate?.finishMessage ?? null,
  } satisfies GenerationAttempt;
}

export async function generateAdvisorWithResilience(input: {
  ai: GoogleGenAI;
  prompt: string;
  retryPrompt: string;
  actionType: AdvisorActionType;
  systemInstruction: string;
  minWords: number;
  requiredSections: string[];
  groundingGroups: string[][];
  structuredFallback: () => string;
}): Promise<AdvisorGenerationResult> {
  let lastFailure: AdvisorProviderFailure | null = null;
  let lastModel = ADVISOR_MODELS[0];
  let lastResponseLength = 0;
  let lastFinishReason: string | null = null;
  let attemptsMade = 0;
  let qualityRetryUsed = false;

  for (let attemptIndex = 0; attemptIndex < MAX_PROVIDER_ATTEMPTS; attemptIndex += 1) {
    const model = modelForAttempt(attemptIndex);
    const prompt = qualityRetryUsed || attemptIndex > 0 ? input.retryPrompt : input.prompt;
    lastModel = model;
    attemptsMade = attemptIndex + 1;

    try {
      const attempt = await generateAttempt({ ...input, prompt, model });
      lastResponseLength = attempt.reply.length;
      lastFinishReason = attempt.finishReason;
      const completeness = responseCompleteness({
        attempt,
        minWords: input.minWords,
        requiredSections: input.requiredSections,
        groundingGroups: input.groundingGroups,
      });

      if (completeness.complete) {
        console.info("AI Advisor generation", {
          model,
          responseLength: attempt.reply.length,
          retriesAttempted: attemptIndex,
          finishReason: attempt.finishReason,
          responseComplete: true,
          finalStatus: "success",
        });
        return {
          reply: attempt.reply,
          modelUsed: model,
          retryCount: attemptIndex,
          responseLength: attempt.reply.length,
          responseComplete: true,
          finishReason: attempt.finishReason,
          usedStructuredFallback: false,
          finalFailure: null,
        };
      }

      lastFailure = {
        code: attempt.reply ? "incomplete_response" : "empty_response",
        status: 502,
        message: `${completeness.reasons.join("; ")}${attempt.finishMessage ? `; ${attempt.finishMessage}` : ""}`,
        retryable: true,
      };

      if (qualityRetryUsed) break;
      qualityRetryUsed = true;
    } catch (error) {
      lastFailure = classifyProviderError(error, model);
      if (!lastFailure.retryable && lastFailure.code !== "model_error") break;
    }

    if (attemptIndex < MAX_PROVIDER_ATTEMPTS - 1) {
      await delay(RETRY_DELAYS_MS[attemptIndex] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
    }
  }

  const retryCount = Math.max(0, attemptsMade - 1);
  if (lastFailure?.code === "empty_response" || lastFailure?.code === "incomplete_response") {
    const fallback = input.structuredFallback();
    console.warn("AI Advisor generation", {
      model: lastModel,
      responseLength: lastResponseLength,
      retriesAttempted: retryCount,
      finishReason: lastFinishReason,
      responseComplete: false,
      finalStatus: "structured_fallback",
      failureCode: lastFailure.code,
    });
    return {
      reply: fallback,
      modelUsed: lastModel,
      retryCount,
      responseLength: fallback.length,
      responseComplete: true,
      finishReason: lastFinishReason,
      usedStructuredFallback: true,
      finalFailure: lastFailure,
    };
  }

  const failure = lastFailure ?? {
    code: "backend_error" as const,
    status: 500,
    message: "Unexpected Advisor backend error.",
    retryable: true,
  };
  console.error("AI Advisor generation", {
    model: lastModel,
    responseLength: lastResponseLength,
    retriesAttempted: retryCount,
    finishReason: lastFinishReason,
    responseComplete: false,
    finalStatus: "failed",
    failureCode: failure.code,
    providerStatus: failure.status,
  });
  throw new AdvisorGenerationError(failure, lastModel, retryCount, lastResponseLength, lastFinishReason);
}
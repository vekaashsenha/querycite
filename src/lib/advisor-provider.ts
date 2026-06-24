import { ApiError, GoogleGenAI, ThinkingLevel } from "@google/genai";
import { getGeminiModelSequence } from "@/lib/gemini";
import type { AdvisorActionType } from "@/lib/plans";

const ADVISOR_MODELS = getGeminiModelSequence("advisor");
const ADVISOR_TIMEOUT_MS = 22_000;
const MAX_PROVIDER_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [550, 1_100];

export type AdvisorProviderErrorCode =
  | "timeout"
  | "quota"
  | "invalid_key"
  | "model_error"
  | "empty_response"
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
  usedStructuredFallback: boolean;
  finalFailure: AdvisorProviderFailure | null;
};

export class AdvisorGenerationError extends Error {
  failure: AdvisorProviderFailure;
  modelUsed: string;
  retryCount: number;
  responseLength: number;

  constructor(failure: AdvisorProviderFailure, modelUsed: string, retryCount: number, responseLength: number) {
    super(failure.message);
    this.name = "AdvisorGenerationError";
    this.failure = failure;
    this.modelUsed = modelUsed;
    this.retryCount = retryCount;
    this.responseLength = responseLength;
  }
}

function delay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function wordCount(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
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
  minWords: number;
  qualityRetry: boolean;
}) {
  const operation = input.ai.models.generateContent({
    model: input.model,
    contents: input.qualityRetry
      ? `${input.prompt}\n\nThe previous draft was empty, incomplete, or under ${input.minWords} words. Regenerate the complete answer now. Use every required heading, finish every sentence, and return 140-240 useful words grounded in the report.`
      : input.prompt,
    config: {
      temperature: 0.25,
      maxOutputTokens: input.actionType === "chat" ? 1_400 : 1_900,
      systemInstruction: input.systemInstruction,
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      httpOptions: { timeout: ADVISOR_TIMEOUT_MS },
    },
  });
  const response = await withTimeout(operation, ADVISOR_TIMEOUT_MS + 1_000);
  return response.text?.trim() ?? "";
}

export async function generateAdvisorWithResilience(input: {
  ai: GoogleGenAI;
  prompt: string;
  actionType: AdvisorActionType;
  systemInstruction: string;
  minWords: number;
  structuredFallback: () => string;
}): Promise<AdvisorGenerationResult> {
  let lastFailure: AdvisorProviderFailure | null = null;
  let lastModel = ADVISOR_MODELS[0];
  let lastResponseLength = 0;
  let qualityRetry = false;
  let attemptsMade = 0;

  for (let attemptIndex = 0; attemptIndex < MAX_PROVIDER_ATTEMPTS; attemptIndex += 1) {
    const model = modelForAttempt(attemptIndex);
    lastModel = model;
    attemptsMade = attemptIndex + 1;

    try {
      const wasQualityRetry = qualityRetry;
      const reply = await generateAttempt({ ...input, model, qualityRetry });
      lastResponseLength = reply.length;

      if (reply && wordCount(reply) >= input.minWords) {
        console.info("AI Advisor generation", {
          model,
          responseLength: reply.length,
          retriesAttempted: attemptIndex,
          finalStatus: "success",
        });
        return {
          reply,
          modelUsed: model,
          retryCount: attemptIndex,
          responseLength: reply.length,
          usedStructuredFallback: false,
          finalFailure: null,
        };
      }

      lastFailure = {
        code: "empty_response",
        status: 502,
        message: reply ? `Response was under ${input.minWords} words.` : "Provider returned an empty response.",
        retryable: true,
      };
      if (wasQualityRetry) break;
      qualityRetry = true;
    } catch (error) {
      lastFailure = classifyProviderError(error, model);
      if (!lastFailure.retryable && lastFailure.code !== "model_error") break;
    }

    if (attemptIndex < MAX_PROVIDER_ATTEMPTS - 1) {
      await delay(RETRY_DELAYS_MS[attemptIndex] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1]);
    }
  }

  const retryCount = Math.max(0, attemptsMade - 1);
  if (lastFailure?.code === "empty_response") {
    const fallback = input.structuredFallback();
    console.warn("AI Advisor generation", {
      model: lastModel,
      responseLength: lastResponseLength,
      retriesAttempted: retryCount,
      finalStatus: "structured_fallback",
      failureCode: lastFailure.code,
    });
    return {
      reply: fallback,
      modelUsed: lastModel,
      retryCount,
      responseLength: fallback.length,
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
    finalStatus: "failed",
    failureCode: failure.code,
    providerStatus: failure.status,
  });
  throw new AdvisorGenerationError(failure, lastModel, retryCount, lastResponseLength);
}

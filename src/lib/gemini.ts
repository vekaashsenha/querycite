export const DEFAULT_GEMINI_FLASH_MODEL = "gemini-3.5-flash";
export const DEFAULT_GEMINI_FLASH_FALLBACK_MODEL = "gemini-3.1-flash-lite";

export function getGeminiModel(useCase?: "advisor" | "audit") {
  if (useCase === "advisor") {
    return process.env.GEMINI_ADVISOR_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_FLASH_MODEL;
  }

  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_FLASH_MODEL;
}

export function getGeminiFallbackModel(useCase?: "advisor" | "audit") {
  if (useCase === "advisor") {
    return process.env.GEMINI_ADVISOR_FALLBACK_MODEL || DEFAULT_GEMINI_FLASH_FALLBACK_MODEL;
  }

  return process.env.GEMINI_FALLBACK_MODEL || DEFAULT_GEMINI_FLASH_FALLBACK_MODEL;
}

export function getGeminiModelSequence(useCase?: "advisor" | "audit") {
  return [...new Set([getGeminiModel(useCase), getGeminiFallbackModel(useCase)])];
}

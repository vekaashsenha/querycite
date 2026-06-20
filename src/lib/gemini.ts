export const DEFAULT_GEMINI_FLASH_MODEL = "gemini-3.5-flash";

export function getGeminiModel(useCase?: "advisor" | "audit") {
  if (useCase === "advisor") {
    return process.env.GEMINI_ADVISOR_MODEL || process.env.GEMINI_MODEL || DEFAULT_GEMINI_FLASH_MODEL;
  }

  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_FLASH_MODEL;
}

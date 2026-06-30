export const iimaCouponDraftStorageKey = "querycite_iima_coupon_draft";

const couponDraftMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

export function normalizeIimaCouponDraft(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 40);
}

export function clearIimaCouponDraft() {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.removeItem(iimaCouponDraftStorageKey);
  } catch {
    // Coupon drafts are a temporary convenience and should never block checkout.
  }
}

export function readIimaCouponDraft() {
  if (typeof window === "undefined") return "";

  try {
    const rawDraft = window.localStorage.getItem(iimaCouponDraftStorageKey);
    if (!rawDraft) return "";
    const draft = JSON.parse(rawDraft) as { code?: unknown; savedAt?: unknown };
    const savedAt = typeof draft.savedAt === "number" ? draft.savedAt : 0;
    if (!savedAt || Date.now() - savedAt > couponDraftMaxAgeMs) {
      clearIimaCouponDraft();
      return "";
    }
    return typeof draft.code === "string" ? normalizeIimaCouponDraft(draft.code) : "";
  } catch {
    clearIimaCouponDraft();
    return "";
  }
}

export function saveIimaCouponDraft(value: string) {
  if (typeof window === "undefined") return;
  const code = normalizeIimaCouponDraft(value);

  try {
    if (!code) {
      clearIimaCouponDraft();
      return;
    }
    window.localStorage.setItem(iimaCouponDraftStorageKey, JSON.stringify({ code, savedAt: Date.now() }));
  } catch {
    // Ignore storage failures so coupon validation still works.
  }
}
"use client";

import { useEffect } from "react";

export type AppearanceMode = "system" | "light" | "dark";
export type ContrastMode = "comfortable" | "high";

export const appearanceStorageKey = "querycite_appearance";
export const contrastStorageKey = "querycite_contrast";
export const appearanceChangeEvent = "querycite-appearance-change";

function validAppearance(value: string | null): AppearanceMode {
  return value === "light" || value === "dark" ? value : "system";
}

function validContrast(value: string | null): ContrastMode {
  return value === "high" ? "high" : "comfortable";
}

function applyPreferences() {
  const appearance = validAppearance(window.localStorage.getItem(appearanceStorageKey));
  const contrast = validContrast(window.localStorage.getItem(contrastStorageKey));
  const resolvedAppearance = appearance === "system"
    ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
    : appearance;
  const root = document.documentElement;

  root.classList.remove("theme-light", "theme-dark", "contrast-comfortable", "contrast-high");
  root.classList.add(`theme-${resolvedAppearance}`, `contrast-${contrast}`);
  root.dataset.appearance = appearance;
  root.style.colorScheme = resolvedAppearance;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onPreferenceChange = () => applyPreferences();
    applyPreferences();
    window.addEventListener("storage", onPreferenceChange);
    window.addEventListener(appearanceChangeEvent, onPreferenceChange);
    media.addEventListener("change", onPreferenceChange);

    return () => {
      window.removeEventListener("storage", onPreferenceChange);
      window.removeEventListener(appearanceChangeEvent, onPreferenceChange);
      media.removeEventListener("change", onPreferenceChange);
    };
  }, []);

  return children;
}

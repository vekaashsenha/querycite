"use client";

import { useSyncExternalStore } from "react";
import {
  appearanceChangeEvent,
  appearanceStorageKey,
  contrastStorageKey,
  type AppearanceMode,
  type ContrastMode,
} from "@/components/ThemeProvider";

const appearanceOptions: Array<{ value: AppearanceMode; label: string }> = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];

const contrastOptions: Array<{ value: ContrastMode; label: string }> = [
  { value: "comfortable", label: "Comfortable" },
  { value: "high", label: "High contrast" },
];

function optionClass(active: boolean) {
  return `min-h-11 rounded-xl border px-4 text-sm font-semibold transition ${
    active
      ? "border-violet-500 bg-violet-600 text-white shadow-sm"
      : "border-slate-200 bg-white text-slate-700 hover:border-violet-300"
  }`;
}

function preferenceSnapshot() {
  const appearance = window.localStorage.getItem(appearanceStorageKey);
  const contrast = window.localStorage.getItem(contrastStorageKey);
  const safeAppearance = appearance === "light" || appearance === "dark" ? appearance : "system";
  const safeContrast = contrast === "high" ? "high" : "comfortable";
  return `${safeAppearance}|${safeContrast}`;
}

function serverPreferenceSnapshot() {
  return "system|comfortable";
}

function subscribeToPreferences(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(appearanceChangeEvent, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(appearanceChangeEvent, onStoreChange);
  };
}

export function AppearanceSettings() {
  const snapshot = useSyncExternalStore(subscribeToPreferences, preferenceSnapshot, serverPreferenceSnapshot);
  const [appearanceValue, contrastValue] = snapshot.split("|");
  const appearance = appearanceValue as AppearanceMode;
  const contrast = contrastValue as ContrastMode;

  function updateAppearance(value: AppearanceMode) {
    window.localStorage.setItem(appearanceStorageKey, value);
    window.dispatchEvent(new Event(appearanceChangeEvent));
  }

  function updateContrast(value: ContrastMode) {
    window.localStorage.setItem(contrastStorageKey, value);
    window.dispatchEvent(new Event(appearanceChangeEvent));
  }

  return (
    <div className="grid gap-6">
      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">Appearance</legend>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {appearanceOptions.map((option) => (
            <button key={option.value} type="button" aria-pressed={appearance === option.value} onClick={() => updateAppearance(option.value)} className={optionClass(appearance === option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset>
        <legend className="text-sm font-semibold text-slate-700">Contrast</legend>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {contrastOptions.map((option) => (
            <button key={option.value} type="button" aria-pressed={contrast === option.value} onClick={() => updateContrast(option.value)} className={optionClass(contrast === option.value)}>
              {option.label}
            </button>
          ))}
        </div>
      </fieldset>
      <p className="text-xs font-medium leading-5 text-slate-500">Your preference is saved on this device.</p>
    </div>
  );
}

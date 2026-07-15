"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import { THEME_STORAGE_KEY } from "./theme-shared";

export type ThemePreference = "light" | "dark" | "system";
export type ResolvedTheme = "light" | "dark";
export { THEME_STORAGE_KEY };

const EVENT = "nba-fo-theme";

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    /* ignore */
  }
  return "system";
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === "light" || pref === "dark") return pref;
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/** Apply resolved theme classes on <html>. Safe to call before React hydrates. */
export function applyResolvedTheme(resolved: ResolvedTheme) {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.style.colorScheme = resolved;
}

export function applyThemePreference(pref: ThemePreference) {
  applyResolvedTheme(resolveTheme(pref));
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY || e.key === null) onStoreChange();
  };
  const onCustom = () => onStoreChange();
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const onScheme = () => onStoreChange();

  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onCustom);
  mql.addEventListener("change", onScheme);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onCustom);
    mql.removeEventListener("change", onScheme);
  };
}

function getServerSnapshot(): ThemePreference {
  return "system";
}

export function useTheme() {
  const preference = useSyncExternalStore(
    subscribe,
    readThemePreference,
    getServerSnapshot
  );
  const resolved = resolveTheme(preference);

  // Keep DOM in sync when preference or OS scheme changes.
  useEffect(() => {
    applyThemePreference(preference);
  }, [preference, resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyThemePreference(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  /** Cycle light → dark → system → light. */
  const cycle = useCallback(() => {
    const order: ThemePreference[] = ["light", "dark", "system"];
    const i = order.indexOf(preference);
    setPreference(order[(i + 1) % order.length]!);
  }, [preference, setPreference]);

  /** Flip between light and dark (drops “system” into an explicit choice). */
  const toggle = useCallback(() => {
    setPreference(resolved === "dark" ? "light" : "dark");
  }, [resolved, setPreference]);

  return {
    preference,
    resolved,
    setPreference,
    cycle,
    toggle,
    isDark: resolved === "dark",
  };
}


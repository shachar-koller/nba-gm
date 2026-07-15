"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  FONT_SIZE_SCALES,
  FONT_SIZE_STORAGE_KEY,
  type FontSize,
} from "./theme-shared";

export type { FontSize };
export { FONT_SIZE_STORAGE_KEY };

const EVENT = "nba-fo-font-size";

const VALID: FontSize[] = ["small", "medium", "large", "xl"];

export function readFontSize(): FontSize {
  try {
    const stored = localStorage.getItem(FONT_SIZE_STORAGE_KEY);
    if (stored && (VALID as string[]).includes(stored)) {
      return stored as FontSize;
    }
  } catch {
    /* ignore */
  }
  return "medium";
}

/** Apply font size via data attr + direct zoom (var()-based zoom is unreliable). */
export function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.dataset.fontSize = size;
  const scale = FONT_SIZE_SCALES[size] ?? FONT_SIZE_SCALES.medium;
  // Prefer zoom (scales fixed-px UI). Fall back to root font-size only when
  // zoom is unsupported — never both, or rem text double-scales.
  const zoomOk =
    typeof CSS !== "undefined" &&
    typeof CSS.supports === "function" &&
    CSS.supports("zoom", "1.1");
  if (zoomOk) {
    root.style.zoom = String(scale);
    root.style.removeProperty("font-size");
  } else {
    root.style.removeProperty("zoom");
    root.style.fontSize = `${scale * 100}%`;
  }
}

function subscribe(onStoreChange: () => void) {
  const onStorage = (e: StorageEvent) => {
    if (e.key === FONT_SIZE_STORAGE_KEY || e.key === null) onStoreChange();
  };
  const onCustom = () => onStoreChange();
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, onCustom);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, onCustom);
  };
}

export function useFontSize() {
  const size = useSyncExternalStore(subscribe, readFontSize, () => "medium" as FontSize);

  useEffect(() => {
    applyFontSize(size);
  }, [size]);

  const setSize = useCallback((next: FontSize) => {
    try {
      localStorage.setItem(FONT_SIZE_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
    applyFontSize(next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { size, setSize };
}

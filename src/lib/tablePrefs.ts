"use client";

import { useCallback, useSyncExternalStore } from "react";

export type TableDensity = "comfortable" | "compact";

const DENSITY_KEY = "nba-fo-table-density";
const EVENT = "nba-fo-density";

function readDensity(): TableDensity {
  try {
    const stored = localStorage.getItem(DENSITY_KEY) as TableDensity | null;
    if (stored === "comfortable" || stored === "compact") return stored;
  } catch {
    /* ignore */
  }
  return "compact";
}

function subscribe(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener("storage", handler);
  window.addEventListener(EVENT, handler);
  return () => {
    window.removeEventListener("storage", handler);
    window.removeEventListener(EVENT, handler);
  };
}

export function useTableDensity() {
  const density = useSyncExternalStore(subscribe, readDensity, () => "compact" as TableDensity);

  const setDensity = useCallback((next: TableDensity) => {
    try {
      localStorage.setItem(DENSITY_KEY, next);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(() => {
    setDensity(density === "compact" ? "comfortable" : "compact");
  }, [density, setDensity]);

  return {
    density,
    compact: density === "compact",
    setDensity,
    toggle,
  };
}

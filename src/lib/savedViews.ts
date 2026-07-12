"use client";

import { useCallback, useSyncExternalStore } from "react";

export interface SavedView {
  id: string;
  name: string;
  path: string;
  query: string;
  createdAt: string;
}

const KEY = "nba-fo-saved-views";
const EVENT = "nba-fo-saved-views";

/** Stable empty snapshot — must be referentially equal across getSnapshot calls. */
const EMPTY: SavedView[] = [];

let cachedRaw: string | null | undefined = undefined;
let cachedSnapshot: SavedView[] = EMPTY;

function getSnapshot(): SavedView[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }

  // Same raw string → same array reference (required by useSyncExternalStore)
  if (raw === cachedRaw) return cachedSnapshot;

  cachedRaw = raw;
  if (!raw) {
    cachedSnapshot = EMPTY;
    return cachedSnapshot;
  }

  try {
    const parsed = JSON.parse(raw) as SavedView[];
    cachedSnapshot = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    cachedSnapshot = EMPTY;
  }
  return cachedSnapshot;
}

function getServerSnapshot(): SavedView[] {
  return EMPTY;
}

function writeAll(views: SavedView[]) {
  const raw = JSON.stringify(views);
  try {
    localStorage.setItem(KEY, raw);
  } catch {
    /* ignore */
  }
  cachedRaw = raw;
  cachedSnapshot = views;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(EVENT));
  }
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

export function useSavedViews(path: string) {
  const all = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const views = all.filter((v) => v.path === path);

  const save = useCallback(
    (name: string, query: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      const current = [...getSnapshot()];
      const existing = current.findIndex(
        (v) => v.path === path && v.name.toLowerCase() === trimmed.toLowerCase()
      );
      const entry: SavedView = {
        id:
          existing >= 0
            ? current[existing].id
            : `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: trimmed,
        path,
        query: query.replace(/^\?/, ""),
        createdAt: new Date().toISOString(),
      };
      if (existing >= 0) current[existing] = entry;
      else current.push(entry);
      writeAll(current);
    },
    [path]
  );

  const remove = useCallback((id: string) => {
    writeAll(getSnapshot().filter((v) => v.id !== id));
  }, []);

  return { views, save, remove };
}

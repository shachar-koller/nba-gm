"use client";

import { useSyncExternalStore } from "react";
import {
  formatModShortcut,
  formatModShortcutSpoken,
  formatPaletteOpenHint,
  isApplePlatform,
} from "./ux";

function subscribe() {
  // Platform does not change at runtime.
  return () => {};
}

function getAppleSnapshot() {
  return isApplePlatform(navigator.platform, navigator.userAgent);
}

/** SSR / first paint: Ctrl so Windows never flashes ⌘. */
function getServerSnapshot() {
  return false;
}

/**
 * Platform-aware modifier labels for the command palette.
 * Windows/Linux → Ctrl+K; macOS/iOS → ⌘K.
 * Shortcut handling already accepts both metaKey and ctrlKey.
 */
export function useModShortcut(key = "K") {
  const isApple = useSyncExternalStore(
    subscribe,
    getAppleSnapshot,
    getServerSnapshot
  );

  return {
    isApple,
    shortcut: formatModShortcut(isApple, key),
    spoken: formatModShortcutSpoken(isApple, key),
    openHint: formatPaletteOpenHint(isApple),
  };
}

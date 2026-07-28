"use client";

import dynamic from "next/dynamic";

/**
 * Client-only lazy shell so the palette (and its contract index) is not part of
 * the server layout graph and can load after first paint.
 */
const CommandPalette = dynamic(
  () =>
    import("@/components/CommandPalette").then((m) => m.CommandPalette),
  { ssr: false, loading: () => null }
);

export function CommandPaletteLazy() {
  return <CommandPalette />;
}

/**
 * Shared UX helpers for scannable tables, command palette, and filter controls.
 */

/** Human-readable table result count for the sticky results strip. */
export function formatRowCount(shown: number, total?: number): string {
  const n = Math.max(0, Math.floor(shown));
  const shownLabel = n.toLocaleString("en-US");
  if (total != null && Number.isFinite(total) && total !== n) {
    const totalLabel = Math.max(0, Math.floor(total)).toLocaleString("en-US");
    return `Showing ${shownLabel} of ${totalLabel}`;
  }
  const noun = n === 1 ? "row" : "rows";
  return `Showing ${shownLabel} ${noun}`;
}

/** Keep palette / list keyboard selection inside [0, length). */
export function clampActiveIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.floor(index), length - 1));
}

/**
 * Rank a command-palette item against a query.
 * Higher is better; null means no match.
 */
export function scoreSearchMatch(
  label: string,
  hint: string | undefined,
  query: string
): number | null {
  const q = query.trim().toLowerCase();
  if (!q) return 0;
  const l = label.toLowerCase();
  const h = (hint ?? "").toLowerCase();
  if (l === q || h === q) return 100;
  if (l.startsWith(q)) return 80;
  if (l.includes(q)) return 50;
  if (h.includes(q)) return 30;
  return null;
}

/** Whether Escape on a search field should clear rather than bubble. */
export function shouldClearSearchOnEscape(value: string): boolean {
  return value.trim().length > 0;
}

const DAY_MS = 24 * 60 * 60 * 1_000;

export function snapshotAgeDays(
  updatedAt: string,
  nowMs: number = Date.now()
): number | null {
  const updatedAtMs = Date.parse(updatedAt);
  if (Number.isNaN(updatedAtMs)) return null;

  return Math.floor((nowMs - updatedAtMs) / DAY_MS);
}

export function formatSnapshotUpdatedAt(updatedAt: string): string {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

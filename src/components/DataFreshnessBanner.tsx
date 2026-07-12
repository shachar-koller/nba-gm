import { dataAgeDays, dataFreshness, getAppData } from "@/lib/data";

/** Soft warning when the local snapshot is more than a few days old. */
export function DataFreshnessBanner({ maxDays = 7 }: { maxDays?: number }) {
  const data = getAppData();
  const age = dataAgeDays(data);
  if (age == null || age <= maxDays) return null;
  const fresh = dataFreshness(data);

  return (
    <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3.5 py-2 text-[13px] text-[var(--warn)]">
      <span className="font-semibold">Data may be stale.</span> Snapshot last
      updated {fresh.label} ({age} days ago). Run{" "}
      <code className="rounded bg-white/50 px-1.5 py-0.5 text-[11px] font-mono">
        npm run refresh
      </code>{" "}
      to re-scrape Spotrac.
    </div>
  );
}

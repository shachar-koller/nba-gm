"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import {
  formatSnapshotUpdatedAt,
  snapshotAgeDays,
} from "@/lib/freshness";

const MINUTE_MS = 60 * 1_000;

function subscribeToMinuteClock(onChange: () => void) {
  const timer = window.setInterval(onChange, MINUTE_MS);
  return () => window.clearInterval(timer);
}

function readClientMinute(): number | null {
  return Math.floor(Date.now() / MINUTE_MS);
}

function readServerMinute(): null {
  return null;
}

/** Soft warning when the local snapshot is more than a few days old. */
export function DataFreshnessBanner({
  updatedAt,
  maxDays = 7,
}: {
  updatedAt: string;
  maxDays?: number;
}) {
  const currentMinute = useSyncExternalStore(
    subscribeToMinuteClock,
    readClientMinute,
    readServerMinute
  );
  const age =
    currentMinute == null
      ? null
      : snapshotAgeDays(updatedAt, currentMinute * MINUTE_MS);
  if (age == null || age <= maxDays) return null;
  const updatedLabel = formatSnapshotUpdatedAt(updatedAt);

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 rounded-[var(--radius-sm)] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-3.5 py-2 text-[13px] text-[var(--warn)]"
      role="status"
    >
      <span>
        <span className="font-semibold">Data update delayed.</span> Snapshot last
        updated {updatedLabel} ({age} days ago). Recent transactions may not be
        reflected yet.
      </span>
      <Link
        href="/methodology"
        className="shrink-0 font-semibold underline decoration-current/40 underline-offset-2 hover:decoration-current"
      >
        Sources &amp; methodology →
      </Link>
    </div>
  );
}

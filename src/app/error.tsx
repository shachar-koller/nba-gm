"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--neg)]">
        Something went wrong
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">
        This page hit an unexpected error
      </h1>
      <p className="mt-2 text-[13px] text-[var(--muted)]">
        Try again, or head back to the league overview. If it keeps happening after a
        data refresh, the snapshot may be invalid.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] hover:border-[var(--border-strong)]"
        >
          League overview
        </Link>
      </div>
    </div>
  );
}

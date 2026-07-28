import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center">
      <p className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        404
      </p>
      <h1 className="mt-2 text-xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-2 text-[13px] text-[var(--muted)]">
        That URL doesn&apos;t match a team, report, or page in Front Office. Check the
        spelling or pick a destination below.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="rounded-[var(--radius-sm)] bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white hover:bg-[var(--accent-hover)]"
        >
          League overview
        </Link>
        <Link
          href="/teams"
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] hover:border-[var(--border-strong)]"
        >
          All teams
        </Link>
        <Link
          href="/salaries"
          className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] hover:border-[var(--border-strong)]"
        >
          Player salaries
        </Link>
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div
      className="space-y-4 animate-pulse"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="h-7 w-48 rounded bg-[var(--surface-3)]" />
      <div className="h-4 w-72 max-w-full rounded bg-[var(--surface-2)]" />
      <div className="mt-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-16 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]"
          />
        ))}
      </div>
      <div className="mt-4 h-64 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

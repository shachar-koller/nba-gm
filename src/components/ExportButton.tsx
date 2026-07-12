"use client";

import { downloadCsv, toCsv } from "@/lib/csv";

export function ExportButton({
  filename,
  headers,
  rows,
  label = "Export CSV",
}: {
  filename: string;
  headers: string[];
  rows: Array<Array<string | number | null | undefined>>;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={() => downloadCsv(filename, toCsv(headers, rows))}
      disabled={!rows.length}
      className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] transition-colors disabled:opacity-40"
    >
      {label}
    </button>
  );
}

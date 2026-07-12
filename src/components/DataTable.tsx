"use client";

import { useMemo, useState } from "react";
import { classNames } from "@/lib/format";
import { formatRowCount } from "@/lib/ux";
import { EmptyState } from "./Filters";

export type SortDir = "asc" | "desc";

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  sortable?: boolean;
  sortValue?: (row: T) => string | number | null | undefined;
  className?: string;
  headerClassName?: string;
  align?: "left" | "right";
  sticky?: boolean;
  render: (row: T) => React.ReactNode;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={active ? "text-[var(--accent)]" : "text-[var(--border-strong)] opacity-70"}
      aria-hidden
    >
      {active ? (
        dir === "asc" ? (
          <path d="M12 19V5M5 12l7-7 7 7" />
        ) : (
          <path d="M12 5v14M19 12l-7 7-7-7" />
        )
      ) : (
        <path d="M8 9l4-4 4 4M8 15l4 4 4-4" />
      )}
    </svg>
  );
}

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  defaultSortKey,
  defaultSortDir = "asc",
  sortKey: controlledSortKey,
  sortDir: controlledSortDir,
  onSortChange,
  emptyMessage = "No results match your filters.",
  emptyActionLabel,
  onEmptyAction,
  stickyHeader = true,
  compact = false,
  totalCount,
  showCount = true,
}: {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T, index: number) => string;
  defaultSortKey?: string;
  defaultSortDir?: SortDir;
  sortKey?: string;
  sortDir?: SortDir;
  onSortChange?: (key: string, dir: SortDir) => void;
  emptyMessage?: string;
  emptyActionLabel?: string;
  onEmptyAction?: () => void;
  stickyHeader?: boolean;
  compact?: boolean;
  /** Unfiltered total for “Showing N of M” when filters narrow the list. */
  totalCount?: number;
  showCount?: boolean;
}) {
  const [internalKey, setInternalKey] = useState(defaultSortKey ?? "");
  const [internalDir, setInternalDir] = useState<SortDir>(defaultSortDir);

  const controlled = onSortChange != null;
  const sortKey = controlled ? (controlledSortKey ?? defaultSortKey ?? "") : internalKey;
  const sortDir = controlled ? (controlledSortDir ?? defaultSortDir) : internalDir;

  const sorted = useMemo(() => {
    if (!sortKey) return rows;
    const col = columns.find((c) => c.key === sortKey);
    if (!col?.sortValue) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = col.sortValue!(a);
      const bv = col.sortValue!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const as = String(av).toLowerCase();
      const bs = String(bv).toLowerCase();
      return sortDir === "asc" ? as.localeCompare(bs) : bs.localeCompare(as);
    });
    return copy;
  }, [rows, columns, sortKey, sortDir]);

  function onSort(key: string) {
    let nextDir: SortDir = "asc";
    if (sortKey === key) {
      nextDir = sortDir === "asc" ? "desc" : "asc";
    }
    if (controlled) {
      onSortChange!(key, nextDir);
    } else if (sortKey === key) {
      setInternalDir(nextDir);
    } else {
      setInternalKey(key);
      setInternalDir("asc");
    }
  }

  const cellPad = compact ? "px-2 py-1" : "px-2.5 py-1.5";
  const textSize = "text-[13px]";
  const countLabel = formatRowCount(sorted.length, totalCount);

  return (
    <div className="overflow-hidden rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      {showCount && sorted.length > 0 && (
        <div
          data-row-count
          className="flex items-center justify-between gap-2 border-b border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[11px] text-[var(--muted)] print:hidden"
        >
          <span className="tabular-nums font-medium text-[var(--foreground)]">
            {countLabel}
          </span>
          {sortKey && (
            <span className="truncate text-[var(--faint)]">
              Sorted by {sortKey}
              {sortDir === "asc" ? " ↑" : " ↓"}
            </span>
          )}
        </div>
      )}
      <div className="overflow-auto max-h-[min(74vh,780px)] print:max-h-none print:overflow-visible">
        <table className={classNames("min-w-full border-separate border-spacing-0", textSize)}>
          <thead
            className={classNames(
              stickyHeader && "sticky top-0 z-20 print:static",
              "bg-[var(--table-head)]"
            )}
          >
            <tr>
              {columns.map((col) => {
                const alignRight = col.align === "right";
                const isActive = sortKey === col.key;
                return (
                  <th
                    key={col.key}
                    scope="col"
                    role="columnheader"
                    aria-sort={
                      col.sortable
                        ? isActive
                          ? sortDir === "asc"
                            ? "ascending"
                            : "descending"
                          : "none"
                        : undefined
                    }
                    tabIndex={col.sortable ? 0 : undefined}
                    onClick={col.sortable ? () => onSort(col.key) : undefined}
                    onKeyDown={
                      col.sortable
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              onSort(col.key);
                            }
                          }
                        : undefined
                    }
                    className={classNames(
                      cellPad,
                      "border-b border-[var(--border-strong)] text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] whitespace-nowrap bg-[var(--table-head)]",
                      alignRight ? "text-right" : "text-left",
                      col.headerClassName,
                      col.sortable &&
                        "cursor-pointer select-none hover:text-[var(--foreground)]",
                      col.sticky &&
                        "sticky left-0 z-30 shadow-[2px_0_0_0_var(--border)] print:static print:shadow-none"
                    )}
                  >
                    <span
                      className={classNames(
                        "inline-flex items-center gap-1",
                        alignRight && "flex-row-reverse"
                      )}
                    >
                      {col.header}
                      {col.sortable && <SortIcon active={isActive} dir={sortDir} />}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    message={emptyMessage}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                  />
                </td>
              </tr>
            ) : (
              sorted.map((row, i) => (
                <tr
                  key={rowKey(row, i)}
                  className={classNames(
                    "group transition-colors hover:bg-[var(--row-hover)]",
                    i % 2 === 1 && "bg-[var(--row-stripe)]"
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={classNames(
                        cellPad,
                        "border-b border-[var(--border)] align-middle text-[var(--foreground)]",
                        col.align === "right" && "text-right",
                        col.className,
                        col.sticky &&
                          "sticky left-0 z-10 bg-[var(--surface)] group-hover:bg-[var(--row-hover)] shadow-[2px_0_0_0_var(--border)] print:static print:shadow-none",
                        col.sticky && i % 2 === 1 && "bg-[var(--row-stripe)]"
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import type { TableDensity } from "@/lib/tablePrefs";
import { classNames } from "@/lib/format";

export function DensityToggle({
  density,
  onChange,
}: {
  density: TableDensity;
  onChange: (d: TableDensity) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Table density"
      className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
    >
      {(
        [
          ["comfortable", "Comfort"],
          ["compact", "Compact"],
        ] as const
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={classNames(
            "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors",
            density === value
              ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
              : "text-[var(--muted)] hover:text-[var(--foreground)]"
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

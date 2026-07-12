"use client";

import { classNames } from "@/lib/format";
import { shouldClearSearchOnEscape } from "@/lib/ux";
import type { ActiveFilterChip } from "@/lib/urlState";

export function FilterBar({
  children,
  onClear,
  hasActive,
  chips,
  onClearChip,
}: {
  children: React.ReactNode;
  onClear?: () => void;
  hasActive?: boolean;
  chips?: ActiveFilterChip[];
  onClearChip?: (key: string) => void;
}) {
  const showChips = Boolean(chips?.length && onClearChip);

  return (
    <div
      data-sticky-filters
      className="sticky top-12 z-30 border-y border-[var(--border)] bg-[var(--surface)]/95 shadow-[0_1px_0_0_var(--border)] backdrop-blur-md print:static print:bg-[var(--surface)] print:shadow-none print:backdrop-blur-none"
    >
      <div className="flex flex-wrap items-end gap-2 px-2.5 py-2">{children}</div>
      {(showChips || (hasActive && onClear)) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-[var(--border)] px-2.5 py-2">
          {showChips &&
            chips!.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => onClearChip!(c.key)}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)] transition-colors hover:border-[var(--accent)]"
                title={`Remove ${c.label} filter`}
              >
                <span className="text-[10px] uppercase tracking-wide opacity-75">
                  {c.label}
                </span>
                <span className="max-w-[140px] truncate">{c.display}</span>
                <span aria-hidden className="opacity-60">
                  ×
                </span>
              </button>
            ))}
          {hasActive && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="ml-auto text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={classNames("flex min-w-[110px] flex-1 flex-col gap-0.5", className)}>
      <span className="label-caps">{label}</span>
      {children}
    </label>
  );
}

const controlClass =
  "w-full rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] outline-none transition-shadow placeholder:text-[var(--faint)] focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15";

export function SearchInput({
  value,
  onChange,
  placeholder = "Search…",
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  id?: string;
}) {
  const hasValue = shouldClearSearchOnEscape(value);
  return (
    <div className="relative">
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape" && shouldClearSearchOnEscape(value)) {
            e.preventDefault();
            e.stopPropagation();
            onChange("");
          }
        }}
        placeholder={placeholder}
        className={`${controlClass} ${hasValue ? "pr-8" : ""}`}
        autoComplete="off"
      />
      {hasValue && (
        <button
          type="button"
          onClick={() => onChange("")}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded px-1 py-0.5 text-[12px] leading-none text-[var(--muted)] hover:bg-[var(--surface-3)] hover:text-[var(--foreground)]"
          aria-label="Clear search"
          title="Clear (Esc)"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder = "All",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={controlClass}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function StatCard({
  label,
  value,
  hint,
  accent,
  href,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  hint?: React.ReactNode;
  accent?: string;
  href?: string;
}) {
  const inner = (
    <>
      <div className="label-caps">{label}</div>
      <div
        className="mt-0.5 text-[15px] font-semibold leading-none tabular-nums tracking-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {hint && <div className="mt-1 text-[11px] text-[var(--muted)] leading-snug">{hint}</div>}
    </>
  );

  const baseCls =
    "block rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-3 py-2";

  if (href) {
    return (
      <a
        href={href}
        className={`${baseCls} transition-colors hover:border-[var(--border-strong)]`}
      >
        {inner}
      </a>
    );
  }

  return <div className={baseCls}>{inner}</div>;
}

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:items-end sm:justify-between print:mb-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.35rem]">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 max-w-2xl text-[13px] text-[var(--muted)] leading-relaxed print:hidden">
            {description}
          </p>
        )}
      </div>
      {children && (
        <div className="flex flex-wrap items-center gap-1.5 print:hidden">{children}</div>
      )}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div
      role="tablist"
      className="inline-flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
    >
      {options.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={classNames(
              "rounded-[5px] px-2.5 py-1 text-[11px] font-medium transition-colors",
              active
                ? "bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-sm)]"
                : "text-[var(--muted)] hover:text-[var(--foreground)]"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function EmptyState({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="px-4 py-12 text-center" role="status">
      <div className="mx-auto mb-2 flex h-9 w-9 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--surface-2)] text-[14px] text-[var(--faint)]">
        ∅
      </div>
      <p className="text-[13px] font-medium text-[var(--foreground)]">{message}</p>
      <p className="mt-1 text-[12px] text-[var(--muted)]">
        Try broadening filters or clearing search.
      </p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-3 inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--accent-border)] bg-[var(--accent-soft)] px-2.5 py-1 text-[12px] font-medium text-[var(--accent)] hover:border-[var(--accent)]"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}

/** Compact toolbar button */
export function ToolButton({
  children,
  onClick,
  disabled,
  primary,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  primary?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={classNames(
        "inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] px-2.5 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-40",
        primary
          ? "bg-[var(--accent)] text-white hover:bg-[var(--accent-hover)]"
          : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
      )}
    >
      {children}
    </button>
  );
}

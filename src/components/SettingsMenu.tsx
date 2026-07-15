"use client";

import { useEffect, useId, useRef, useState } from "react";
import { classNames } from "@/lib/format";
import { useTheme, type ThemePreference } from "@/lib/theme";
import { useFontSize, type FontSize } from "@/lib/fontSize";
import { useTableDensity, type TableDensity } from "@/lib/tablePrefs";

function Segmented<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; title?: string }[];
}) {
  const groupId = useId();
  return (
    <div className="space-y-1.5">
      <div id={groupId} className="label-caps">
        {label}
      </div>
      <div
        role="radiogroup"
        aria-labelledby={groupId}
        className="flex rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] p-0.5"
      >
        {options.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={active}
              title={o.title}
              onClick={() => onChange(o.value)}
              className={classNames(
                "min-w-0 flex-1 rounded-[5px] px-2 py-1.5 text-[11px] font-medium transition-colors",
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
    </div>
  );
}

export function SettingsMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const { preference, setPreference } = useTheme();
  const { size, setSize } = useFontSize();
  const { density, setDensity } = useTableDensity();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent | PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--muted)] transition-colors hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        title="Display settings"
      >
        <GearIcon />
        <span className="hidden sm:inline">Settings</span>
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Display settings"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(100vw-1.5rem,18.5rem)] rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-elevated)] p-3 shadow-[var(--shadow-md)]"
        >
          <p className="mb-3 text-[12px] font-semibold tracking-tight text-[var(--foreground)]">
            Display
          </p>
          <div className="space-y-3.5">
            <Segmented<ThemePreference>
              label="Theme"
              value={preference}
              onChange={setPreference}
              options={[
                { value: "light", label: "Light" },
                { value: "dark", label: "Dark" },
                { value: "system", label: "System", title: "Match OS light/dark" },
              ]}
            />
            <Segmented<FontSize>
              label="Text size"
              value={size}
              onChange={setSize}
              options={[
                { value: "small", label: "S", title: "Small text" },
                { value: "medium", label: "M", title: "Medium text (default)" },
                { value: "large", label: "L", title: "Large text" },
                { value: "xl", label: "XL", title: "Extra-large text" },
              ]}
            />
            <Segmented<TableDensity>
              label="Table density"
              value={density}
              onChange={setDensity}
              options={[
                {
                  value: "compact",
                  label: "Compact",
                  title: "Tighter row padding",
                },
                {
                  value: "comfortable",
                  label: "Comfort",
                  title: "More row padding",
                },
              ]}
            />
          </div>
          <p className="mt-3 text-[10px] leading-snug text-[var(--faint)]">
            Preferences are saved in this browser.
          </p>
        </div>
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.3.6.9 1 1.5 1.1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  );
}

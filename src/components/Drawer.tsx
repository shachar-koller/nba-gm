"use client";

import { useEffect } from "react";
import { classNames } from "@/lib/format";

export function Drawer({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end print:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-[rgb(14_21_36/0.4)]"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        className={classNames(
          "animate-drawer-in relative flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]",
          wide ? "max-w-xl" : "max-w-md"
        )}
      >
        <header className="flex items-start justify-between gap-3 border-b border-[var(--border-strong)] px-4 py-3">
          <div className="min-w-0 text-[15px] font-semibold leading-snug">{title}</div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-[var(--radius-sm)] border border-[var(--border)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
          >
            Esc
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-4 py-3">{children}</div>
      </aside>
    </div>
  );
}

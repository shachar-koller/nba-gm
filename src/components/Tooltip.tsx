"use client";

import { useId, useState } from "react";
import { classNames } from "@/lib/format";

export function Tooltip({
  content,
  children,
  className,
}: {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={classNames("relative inline-flex items-center", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      <button
        type="button"
        className="inline-flex items-center gap-1 text-left cursor-help"
        aria-describedby={open ? id : undefined}
      >
        {children}
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full border border-[var(--border)] text-[9px] text-[var(--muted)] leading-none">
          ?
        </span>
      </button>
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-2 w-64 max-w-[min(80vw,16rem)] rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[var(--foreground)] shadow-[var(--shadow-md)] sm:left-auto sm:right-0"
        >
          {content}
        </span>
      )}
    </span>
  );
}

export function InfoTip({ label, text }: { label: string; text: string }) {
  return (
    <Tooltip content={text}>
      <span className="font-medium text-[var(--foreground)]">{label}</span>
    </Tooltip>
  );
}

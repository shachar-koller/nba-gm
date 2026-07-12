"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/format";

const LINKS = [
  { href: "/draft", label: "Draft" },
  { href: "/cap", label: "Cap" },
  { href: "/salaries", label: "Salaries" },
  { href: "/free-agents", label: "Free Agents" },
  { href: "/teams", label: "Teams" },
];

export function Nav({ updatedLabel }: { updatedLabel?: string }) {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)] print:hidden">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link href="/" className="group flex shrink-0 items-baseline gap-1.5 min-w-0" aria-label="Front Office home">
          <span className="text-[14px] font-bold tracking-[-0.03em] text-[var(--foreground)] transition-colors group-hover:text-[var(--accent)]">
            Front Office
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--faint)] sm:inline">
            NBA
          </span>
        </Link>

        <nav className="flex min-w-0 flex-1 items-center gap-0 overflow-x-auto scrollbar-none">
          {LINKS.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={classNames(
                  "shrink-0 border-b-2 px-2.5 py-3 text-[12px] font-medium transition-colors sm:px-3",
                  active
                    ? "border-[var(--accent)] text-[var(--accent)]"
                    : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          {updatedLabel && (
            <span className="hidden lg:inline text-[10px] text-[var(--faint)] tabular-nums">
              Data {updatedLabel}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event("nba-fo-open-palette"));
            }}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] transition-colors"
            aria-label="Open search (Command K)"
            title="Search (⌘K or /)"
          >
            <SearchIcon />
              <span className="hidden sm:inline">Find</span>
            <kbd className="hidden md:inline rounded border border-[var(--border)] bg-[var(--surface-2)] px-1 py-px text-[10px] font-normal text-[var(--faint)]">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3-3" />
    </svg>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { classNames } from "@/lib/format";
import { useModShortcut } from "@/lib/useModShortcut";
import { SettingsMenu } from "./SettingsMenu";

const LINKS = [
  { href: "/", label: "Home" },
  { href: "/draft", label: "Draft" },
  { href: "/cap", label: "Cap" },
  { href: "/salaries", label: "Salaries" },
  { href: "/free-agents", label: "Free Agents" },
  { href: "/teams", label: "Teams" },
  { href: "/stats", label: "Stats" },
  { href: "/stats/advanced", label: "Advanced" },
];

export function Nav({ updatedLabel }: { updatedLabel?: string }) {
  const pathname = usePathname();
  const onHome = pathname === "/";
  const { shortcut, spoken } = useModShortcut();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-md print:hidden">
      <div className="mx-auto flex h-12 max-w-7xl items-center gap-3 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className={classNames(
            "group flex shrink-0 items-baseline gap-1.5 min-w-0",
            onHome && "text-[var(--accent)]"
          )}
          aria-label="Front Office home"
          aria-current={onHome ? "page" : undefined}
        >
          <span
            className={classNames(
              "text-[14px] font-bold tracking-[-0.03em] transition-colors group-hover:text-[var(--accent)]",
              onHome ? "text-[var(--accent)]" : "text-[var(--foreground)]"
            )}
          >
            Front Office
          </span>
          <span className="hidden text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--faint)] sm:inline">
            NBA
          </span>
        </Link>

        <div className="relative min-w-0 flex-1">
          <nav
            className="flex min-w-0 items-center gap-0 overflow-x-auto scrollbar-none [mask-image:linear-gradient(to_right,transparent,black_12px,black_calc(100%-20px),transparent)] sm:[mask-image:none]"
            aria-label="Primary"
          >
            {LINKS.map((link) => {
              // Prefer longest matching href so /stats/advanced does not also
              // highlight the /stats parent.
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : LINKS.filter(
                      (l) =>
                        l.href !== "/" &&
                        (pathname === l.href ||
                          pathname.startsWith(`${l.href}/`))
                    ).sort((a, b) => b.href.length - a.href.length)[0]
                      ?.href === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
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
        </div>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          {updatedLabel && (
            <span className="hidden lg:inline text-[10px] text-[var(--faint)] tabular-nums">
              Data {updatedLabel}
            </span>
          )}
          <SettingsMenu />
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(new Event("nba-fo-open-palette"));
            }}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2 py-1 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:border-[var(--border-strong)] transition-colors"
            aria-label={`Open search (${spoken})`}
            title={`Search (${shortcut} or /)`}
          >
            <SearchIcon />
            <span className="hidden sm:inline">Find</span>
            <kbd className="hidden md:inline rounded border border-[var(--border)] bg-[var(--surface-2)] px-1 py-px text-[10px] font-normal text-[var(--faint)]">
              {shortcut}
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

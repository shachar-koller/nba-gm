"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppData } from "@/lib/data";
import { TEAMS } from "@/lib/teams";
import { formatMoney } from "@/lib/format";
import { classNames } from "@/lib/format";

type Item = {
  id: string;
  group: string;
  label: string;
  hint?: string;
  href: string;
};

const PAGES: Item[] = [
  { id: "p-home", group: "Pages", label: "Home", href: "/" },
  { id: "p-draft", group: "Pages", label: "Draft Picks", href: "/draft" },
  { id: "p-cap", group: "Pages", label: "Salary Cap", href: "/cap" },
  { id: "p-sal", group: "Pages", label: "Player Salaries", href: "/salaries" },
  { id: "p-fa", group: "Pages", label: "Free Agent Classes", href: "/free-agents" },
  { id: "p-teams", group: "Pages", label: "Teams", href: "/teams" },
  {
    id: "p-fa-next",
    group: "Pages",
    label: "Next free-agent class",
    href: "/free-agents?view=overview",
  },
  {
    id: "p-ufa",
    group: "Pages",
    label: "Salaries · UFA only",
    href: "/salaries?status=ufa",
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo(() => {
    const data = getAppData();
    const teams: Item[] = TEAMS.map((t) => ({
      id: `t-${t.abbr}`,
      group: "Teams",
      label: t.fullName,
      hint: t.abbr,
      href: `/teams/${t.abbr.toLowerCase()}`,
    }));
    const players: Item[] = data.contracts.map((c) => ({
      id: `c-${c.id}-${c.team}`,
      group: "Players",
      label: c.player,
      hint: `${c.team} · ${formatMoney(c.currentSalary, true)}${c.freeAgencyYear ? ` · FA ${c.freeAgencyYear}` : ""}`,
      href: `/salaries?q=${encodeURIComponent(c.player)}`,
    }));
    return [...PAGES, ...teams, ...players];
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) {
      return [
        ...PAGES,
        ...items.filter((i) => i.group === "Teams").slice(0, 8),
      ];
    }
    const scored = items
      .map((item) => {
        const label = item.label.toLowerCase();
        const hint = (item.hint ?? "").toLowerCase();
        let score = 0;
        if (label === query || hint === query) score = 100;
        else if (label.startsWith(query)) score = 80;
        else if (label.includes(query)) score = 50;
        else if (hint.includes(query)) score = 30;
        else return null;
        return { item, score };
      })
      .filter(Boolean) as Array<{ item: Item; score: number }>;
    scored.sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label));
    return scored.slice(0, 40).map((s) => s.item);
  }, [items, q]);

  const openPalette = useCallback(() => {
    setActive(0);
    setQ("");
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    setQ("");
    setActive(0);
  }, []);

  const go = useCallback(
    (item: Item) => {
      close();
      router.push(item.href);
    },
    [close, router]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => {
          if (o) return false;
          setActive(0);
          setQ("");
          return true;
        });
        return;
      }
      if (e.key === "/" && !open) {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
        e.preventDefault();
        openPalette();
      }
    };
    const onOpen = () => openPalette();
    window.addEventListener("keydown", onKey);
    window.addEventListener("nba-fo-open-palette", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("nba-fo-open-palette", onOpen);
    };
  }, [open, openPalette]);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  if (!open) return null;

  const groups = filtered.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  let flatIndex = -1;

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] print:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-[rgb(14_21_36/0.45)]"
        aria-label="Close command palette"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="relative w-full max-w-lg overflow-hidden rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-md)]"
      >
        <div className="flex items-center gap-2 border-b border-[var(--border-strong)] px-3.5">
          <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted)]">
            ⌘K
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setActive(0);
            }}
            placeholder="Search players, teams, pages…"
            className="w-full bg-transparent py-2.5 text-[13px] outline-none placeholder:text-[var(--faint)]"
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => Math.min(i + 1, filtered.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => Math.max(i - 1, 0));
              } else if (e.key === "Enter" && filtered[active]) {
                e.preventDefault();
                go(filtered[active]);
              }
            }}
          />
          <kbd className="hidden sm:inline rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
            esc
          </kbd>
        </div>
        <div className="max-h-[min(50vh,360px)] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]">
              No matches for “{q}”
            </p>
          ) : (
            Object.entries(groups).map(([group, list]) => (
              <div key={group} className="mb-1">
                <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  {group}
                </div>
                {list.map((item) => {
                  flatIndex += 1;
                  const idx = flatIndex;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(idx)}
                      className={classNames(
                        "flex w-full items-center justify-between gap-3 border-l-2 pl-2.5 pr-3 py-1.5 text-left text-[13px]",
                        idx === active
                          ? "border-l-[var(--accent)] bg-[var(--accent-soft)] text-[var(--foreground)]"
                          : "border-l-transparent hover:bg-[var(--surface-2)]"
                      )}
                    >
                      <span className="font-medium truncate">{item.label}</span>
                      {item.hint && (
                        <span className="shrink-0 text-xs text-[var(--muted)] truncate max-w-[45%]">
                          {item.hint}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
        <div className="border-t border-[var(--border)] px-3 py-2 text-[10px] text-[var(--muted)]">
          ↑↓ navigate · Enter open · Esc close · / or ⌘K to open
        </div>
      </div>
    </div>
  );
}

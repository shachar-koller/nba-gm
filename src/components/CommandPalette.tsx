"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getAppData } from "@/lib/data";
import { getPlayerStats, getPlayerStatsData } from "@/lib/playerStats";
import {
  createPlayerProfileIndex,
  playerProfileHref,
} from "@/lib/playerProfiles";
import { PLAYER_PROFILE_REGISTRY } from "@/lib/playerProfileRegistry";
import { TEAMS } from "@/lib/teams";
import { LEAGUE_STAFF } from "@/lib/staff";
import { formatMoney } from "@/lib/format";
import { classNames } from "@/lib/format";
import { clampActiveIndex, scoreSearchMatch } from "@/lib/ux";
import { useModShortcut } from "@/lib/useModShortcut";

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
    id: "p-staff",
    group: "Pages",
    label: "GMs & Head Coaches",
    href: "/staff",
  },
  { id: "p-stats", group: "Pages", label: "Player Stats", href: "/stats" },
  {
    id: "p-adv",
    group: "Pages",
    label: "Advanced Stats",
    href: "/stats/advanced",
  },
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
  {
    id: "p-pts",
    group: "Pages",
    label: "Stats · by points",
    href: "/stats?sort=pts&dir=desc",
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const { shortcut, openHint } = useModShortcut();

  const items = useMemo(() => {
    const data = getAppData();
    const statsData = getPlayerStatsData();
    const teams: Item[] = TEAMS.map((t) => ({
      id: `t-${t.abbr}`,
      group: "Teams",
      label: t.fullName,
      hint: t.abbr,
      href: `/teams/${t.abbr.toLowerCase()}`,
    }));
    const staff: Item[] = LEAGUE_STAFF.flatMap((row) => [
      {
        id: `e-${row.team}`,
        group: "Staff",
        label: row.executive,
        hint: `${row.team} · GM / lead executive`,
        href: `/staff?q=${encodeURIComponent(row.executive)}`,
      },
      {
        id: `h-${row.team}`,
        group: "Staff",
        label: row.headCoach,
        hint: `${row.team} · Head coach`,
        href: `/staff?q=${encodeURIComponent(row.headCoach)}`,
      },
    ]);
    const profileIndex = createPlayerProfileIndex(
      data.contracts,
      getPlayerStats(statsData),
      PLAYER_PROFILE_REGISTRY
    );
    const players: Item[] = profileIndex.profiles.map((profile) => {
      const contract = profile.contract;
      const hints = [
        profile.team,
        contract?.currentSalary != null
          ? formatMoney(contract.currentSalary, true)
          : null,
        contract?.freeAgencyYear ? `FA ${contract.freeAgencyYear}` : null,
        profile.stats ? `${statsData.season} stats` : null,
      ].filter(Boolean);
      return {
        id: `player-${profile.id}`,
        group: "Players",
        label: profile.name,
        hint: hints.join(" · "),
        href: playerProfileHref(profile.id),
      };
    });
    return [...PAGES, ...teams, ...staff, ...players];
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
        const score = scoreSearchMatch(item.label, item.hint, query);
        if (score == null) return null;
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
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      // Keep focus inside the palette dialog (input + options).
      const root = inputRef.current?.closest('[role="dialog"]') as HTMLElement | null;
      if (!root) return;
      const focusable = root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input, [href], [tabindex]:not([tabindex="-1"])'
      );
      const list = Array.from(focusable).filter((el) => el.offsetParent !== null);
      if (list.length === 0) {
        e.preventDefault();
        return;
      }
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      const el = previouslyFocused.current;
      previouslyFocused.current = null;
      if (el && typeof el.focus === "function") {
        requestAnimationFrame(() => el.focus());
      }
    };
  }, [open]);

  // Keep keyboard selection visible in the scrollable list
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.querySelector<HTMLElement>(
      `[data-palette-index="${active}"]`
    );
    node?.scrollIntoView({ block: "nearest" });
  }, [active, open, filtered]);

  if (!open) return null;

  const groups = filtered.reduce<Record<string, Item[]>>((acc, item) => {
    (acc[item.group] ??= []).push(item);
    return acc;
  }, {});

  let flatIndex = -1;
  const safeActive = clampActiveIndex(active, filtered.length);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[12vh] print:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--overlay)]"
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
            {shortcut}
          </span>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => {
              setQ(e.target.value.slice(0, 256));
              setActive(0);
            }}
            maxLength={256}
            role="combobox"
            aria-expanded={true}
            aria-haspopup="listbox"
            aria-autocomplete="list"
            placeholder="Search players, staff, teams, pages…"
            className="w-full bg-transparent py-2.5 text-[13px] outline-none placeholder:text-[var(--faint)] focus-visible:outline-none focus-visible:ring-0"
            aria-controls="command-palette-list"
            aria-activedescendant={
              filtered[safeActive] ? `palette-item-${filtered[safeActive].id}` : undefined
            }
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                close();
              } else if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((i) => clampActiveIndex(i + 1, filtered.length));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((i) => clampActiveIndex(i - 1, filtered.length));
              } else if (e.key === "Enter" && filtered[safeActive]) {
                e.preventDefault();
                go(filtered[safeActive]);
              }
            }}
          />
          <kbd className="hidden sm:inline rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--muted)]">
            esc
          </kbd>
        </div>
        <div
          id="command-palette-list"
          ref={listRef}
          role="listbox"
          className="max-h-[min(50vh,360px)] overflow-y-auto py-2"
        >
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-[var(--muted)]" role="status">
              No matches for “{q}”
              <span className="mt-1 block text-[12px] text-[var(--faint)]">
                Try a player name, team abbr, or page title
              </span>
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
                      id={`palette-item-${item.id}`}
                      type="button"
                      role="option"
                      data-palette-index={idx}
                      aria-selected={idx === safeActive}
                      onClick={() => go(item)}
                      onMouseEnter={() => setActive(idx)}
                      className={classNames(
                        "flex w-full items-center justify-between gap-3 border-l-2 pl-2.5 pr-3 py-1.5 text-left text-[13px]",
                        idx === safeActive
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
          {openHint}
        </div>
      </div>
    </div>
  );
}

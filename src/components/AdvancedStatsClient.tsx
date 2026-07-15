"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import type { PlayerSeasonStats, TeamAbbr } from "@/lib/types";
import { TEAMS } from "@/lib/teams";
import { formatNum, formatPct } from "@/lib/format";
import {
  ADVANCED_STAT_DEFINITIONS,
  formatRate,
} from "@/lib/playerStats";
import { useUrlFilters } from "@/lib/urlState";
import { useTableDensity } from "@/lib/tablePrefs";
import { positionFilterLabel, positionMatches } from "@/lib/positions";
import {
  ADVANCED_STAT_MIN_FILTERS,
  formatMinFilterChip,
  minFilterDefaults,
  minFilterLabels,
  passesStatMinFilters,
} from "@/lib/statFilters";
import { matchesSearch } from "@/lib/ux";
import type { SortDir } from "./DataTable";
import { DataTable, type Column } from "./DataTable";
import {
  Field,
  FilterBar,
  NumberInput,
  PageHeader,
  SearchInput,
  SelectInput,
  StatCard,
  StatMinFilterSection,
} from "./Filters";
import { TeamChip } from "./TeamLogo";
import { ExportButton } from "./ExportButton";

const STAT_MIN_KEYS = new Set(ADVANCED_STAT_MIN_FILTERS.map((d) => d.key));

const FILTER_DEFAULTS: Record<string, string> = {
  q: "",
  team: "",
  pos: "",
  gp: "20",
  sort: "tsPct",
  dir: "desc",
  ...minFilterDefaults(ADVANCED_STAT_MIN_FILTERS),
};

const FILTER_LABELS: Record<string, string> = {
  q: "Player",
  team: "Team",
  pos: "Pos",
  gp: "Min GP",
  sort: "Sort",
  dir: "Dir",
  ...minFilterLabels(ADVANCED_STAT_MIN_FILTERS),
};

function HeaderWithTip({ abbr, tip }: { abbr: string; tip: string }) {
  return (
    <span
      title={tip}
      className="cursor-help border-b border-dotted border-[var(--border-strong)]"
    >
      {abbr}
    </span>
  );
}

function AdvancedInner({
  players,
  season,
  positions,
}: {
  players: PlayerSeasonStats[];
  season: string;
  positions: string[];
}) {
  const { values, setFilter, setFilters, clearFilters, clearFilter, hasActive, chips } =
    useUrlFilters(FILTER_DEFAULTS, FILTER_LABELS);
  const { q, team, pos, gp, sort, dir } = values;
  const { compact } = useTableDensity();
  const minGp = Number(gp) || 0;

  const visibleChips = chips.filter((c) => {
    if (c.key === "sort" || c.key === "dir") return false;
    if (c.key === "gp" && c.value === "20") return false;
    return true;
  });

  const teamOpts = TEAMS.map((t) => ({
    value: t.abbr,
    label: `${t.abbr} — ${t.name}`,
  }));

  const filtered = useMemo(() => {
    return players.filter((p) => {
      if (team && p.team !== team) return false;
      if (pos && !positionMatches(pos, p.position)) return false;
      if (minGp > 0 && (p.gp ?? 0) < minGp) return false;
      if (!matchesSearch(q, p.player, p.team ?? "", p.position)) return false;
      if (!passesStatMinFilters(p, ADVANCED_STAT_MIN_FILTERS, values)) return false;
      return true;
    });
  }, [players, q, team, pos, minGp, values]);

  const defMap = useMemo(() => {
    const m = new Map(ADVANCED_STAT_DEFINITIONS.map((d) => [d.key, d]));
    return m;
  }, []);

  const tip = (key: string, fallback: string) => {
    const d = defMap.get(key);
    if (!d) return fallback;
    return `${d.name}: ${d.howToUse}`;
  };

  const columns: Column<PlayerSeasonStats>[] = useMemo(
    () => [
      {
        key: "player",
        header: "Player",
        sticky: true,
        sortable: true,
        sortValue: (r) => r.player,
        className: "font-semibold min-w-[140px]",
        render: (r) => (
          <div>
            <div className="text-[13px] leading-tight">{r.player}</div>
            <div className="text-[10px] font-normal text-[var(--muted)]">
              {r.position || "—"}
              {r.age != null ? ` · ${r.age}` : ""}
              {` · ${r.gp} GP`}
            </div>
          </div>
        ),
      },
      {
        key: "team",
        header: "Team",
        sortable: true,
        sortValue: (r) => r.team ?? "",
        render: (r) =>
          r.team ? (
            <TeamChip abbr={r.team as TeamAbbr} />
          ) : (
            <span className="text-[var(--muted)]">—</span>
          ),
      },
      {
        key: "min",
        header: "MIN",
        sortable: true,
        sortValue: (r) => r.min,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatNum(r.min),
      },
      {
        key: "pts",
        header: "PTS",
        sortable: true,
        sortValue: (r) => r.pts,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.pts),
      },
      {
        key: "tsPct",
        header: <HeaderWithTip abbr="TS%" tip={tip("tsPct", "True shooting %")} />,
        sortable: true,
        sortValue: (r) => r.tsPct,
        align: "right",
        className: "tabular-nums font-semibold",
        render: (r) => formatPct(r.tsPct),
      },
      {
        key: "efgPct",
        header: <HeaderWithTip abbr="eFG%" tip={tip("efgPct", "Effective FG%")} />,
        sortable: true,
        sortValue: (r) => r.efgPct,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatPct(r.efgPct),
      },
      {
        key: "threePar",
        header: <HeaderWithTip abbr="3PAr" tip={tip("threePar", "3PA rate")} />,
        sortable: true,
        sortValue: (r) => r.threePar,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatRate(r.threePar),
      },
      {
        key: "ftr",
        header: <HeaderWithTip abbr="FTr" tip={tip("ftr", "FT rate")} />,
        sortable: true,
        sortValue: (r) => r.ftr,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatRate(r.ftr),
      },
      {
        key: "tovPct",
        header: <HeaderWithTip abbr="TOV%" tip={tip("tovPct", "Turnover %")} />,
        sortable: true,
        sortValue: (r) => r.tovPct,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatPct(r.tovPct),
      },
      {
        key: "astTo",
        header: <HeaderWithTip abbr="AST/TO" tip={tip("astTo", "Assist/TO")} />,
        sortable: true,
        sortValue: (r) => r.astTo,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatNum(r.astTo, 2),
      },
      {
        key: "eff",
        header: <HeaderWithTip abbr="EFF" tip={tip("eff", "Efficiency")} />,
        sortable: true,
        sortValue: (r) => r.eff,
        align: "right",
        className: "tabular-nums font-semibold",
        render: (r) => formatNum(r.eff),
      },
      {
        key: "stocks",
        header: (
          <HeaderWithTip abbr="STL+BLK" tip={tip("stocks", "Stocks")} />
        ),
        sortable: true,
        sortValue: (r) => r.stocks,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatNum(r.stocks),
      },
      {
        key: "fgPct",
        header: "FG%",
        sortable: true,
        sortValue: (r) => r.fgPct,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatPct(r.fgPct),
      },
      {
        key: "threePct",
        header: "3P%",
        sortable: true,
        sortValue: (r) => r.threePct,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatPct(r.threePct),
      },
      {
        key: "ast",
        header: "AST",
        sortable: true,
        sortValue: (r) => r.ast,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.ast),
      },
      {
        key: "tov",
        header: "TOV",
        sortable: true,
        sortValue: (r) => r.tov,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.tov),
      },
    ],
    // tip depends on defMap only
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [defMap]
  );

  const leaders = useMemo(() => {
    const byTs = [...filtered]
      .filter((p) => p.tsPct != null)
      .sort((a, b) => (b.tsPct ?? 0) - (a.tsPct ?? 0))[0];
    const byEff = [...filtered]
      .filter((p) => p.eff != null)
      .sort((a, b) => (b.eff ?? 0) - (a.eff ?? 0))[0];
    const byAstTo = [...filtered]
      .filter((p) => p.astTo != null && (p.ast ?? 0) >= 4)
      .sort((a, b) => (b.astTo ?? 0) - (a.astTo ?? 0))[0];
    return { byTs, byEff, byAstTo };
  }, [filtered]);

  const chipDisplay = visibleChips.map((c) => {
    if (c.key === "gp") return { ...c, display: `${c.value}+ games` };
    if (STAT_MIN_KEYS.has(c.key)) {
      return { ...c, display: formatMinFilterChip(c.value) };
    }
    return c;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Advanced Stats"
        description={`${season} regular season — efficiency and rate metrics derived from box scores. Hover column headers for a quick tip; full explanations below.`}
      >
        <Link
          href="/stats"
          className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
        >
          ← Basic stats
        </Link>
        <ExportButton
          filename={`nba-advanced-stats-${season}.csv`}
          headers={[
            "player",
            "team",
            "pos",
            "gp",
            "min",
            "pts",
            "ts_pct",
            "efg_pct",
            "3par",
            "ftr",
            "tov_pct",
            "ast_to",
            "eff",
            "stocks",
            "fg_pct",
            "3p_pct",
            "ast",
            "tov",
          ]}
          rows={filtered.map((p) => [
            p.player,
            p.team,
            p.position,
            p.gp,
            p.min,
            p.pts,
            p.tsPct,
            p.efgPct,
            p.threePar,
            p.ftr,
            p.tovPct,
            p.astTo,
            p.eff,
            p.stocks,
            p.fgPct,
            p.threePct,
            p.ast,
            p.tov,
          ])}
        />
      </PageHeader>

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Players shown" value={filtered.length} />
        <StatCard
          label="TS% leader"
          value={leaders.byTs ? formatPct(leaders.byTs.tsPct) : "—"}
          hint={leaders.byTs?.player}
        />
        <StatCard
          label="EFF leader"
          value={leaders.byEff ? formatNum(leaders.byEff.eff) : "—"}
          hint={leaders.byEff?.player}
        />
        <StatCard
          label="AST/TO (4+ AST)"
          value={leaders.byAstTo ? formatNum(leaders.byAstTo.astTo, 2) : "—"}
          hint={leaders.byAstTo?.player}
        />
      </div>

      <div className="mb-4 print:hidden">
        <FilterBar
          hasActive={hasActive}
          onClear={clearFilters}
          chips={chipDisplay}
          onClearChip={clearFilter}
        >
          <Field label="Player" className="min-w-[200px] flex-[2]">
            <SearchInput
              value={q}
              onChange={(v) => setFilter("q", v)}
              placeholder="Search players…"
            />
          </Field>
          <Field label="Team">
            <SelectInput
              value={team}
              onChange={(v) => setFilter("team", v)}
              options={teamOpts}
              placeholder="All teams"
            />
          </Field>
          <Field label="Position">
            <SelectInput
              value={pos}
              onChange={(v) => setFilter("pos", v)}
              options={positions.map((p) => ({
                value: p,
                label: positionFilterLabel(p),
              }))}
              placeholder="All positions"
            />
          </Field>
          <Field label="Min games">
            <SelectInput
              value={gp}
              onChange={(v) => setFilter("gp", v)}
              options={[
                { value: "1", label: "1+ games" },
                { value: "10", label: "10+ games" },
                { value: "20", label: "20+ games" },
                { value: "40", label: "40+ games" },
                { value: "58", label: "58+ games" },
              ]}
              placeholder="Any"
            />
          </Field>
        </FilterBar>
        <StatMinFilterSection>
          {ADVANCED_STAT_MIN_FILTERS.map((def) => (
            <Field
              key={def.key}
              label={def.label}
              className="min-w-[88px] max-w-[110px] flex-none"
            >
              <NumberInput
                value={values[def.key] ?? ""}
                onChange={(v) => setFilter(def.key, v)}
                placeholder={def.placeholder}
                aria-label={def.label}
              />
            </Field>
          ))}
        </StatMinFilterSection>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        sortKey={sort || "tsPct"}
        sortDir={(dir === "asc" || dir === "desc" ? dir : "desc") as SortDir}
        onSortChange={(key, nextDir) => setFilters({ sort: key, dir: nextDir })}
        compact={compact}
        totalCount={players.length}
        emptyMessage="No players match these filters."
        emptyActionLabel="Clear all filters"
        onEmptyAction={clearFilters}
      />

      <section
        id="glossary"
        className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)]"
        aria-labelledby="adv-glossary-heading"
      >
        <div className="border-b border-[var(--border)] px-3.5 py-2.5">
          <h2
            id="adv-glossary-heading"
            className="text-[14px] font-semibold tracking-tight"
          >
            How to use each advanced stat
          </h2>
          <p className="mt-0.5 text-[12px] text-[var(--muted)]">
            Derived from season totals (ESPN box scores). These are rate and
            efficiency metrics — always read them with minutes, role, and
            sample size.
          </p>
        </div>
        <ul className="divide-y divide-[var(--border)]">
          {ADVANCED_STAT_DEFINITIONS.map((d) => (
            <li key={d.key} id={d.key} className="px-3.5 py-3 sm:px-4">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-[13px] font-semibold tabular-nums text-[var(--accent)]">
                  {d.abbr}
                </span>
                <span className="text-[13px] font-medium">{d.name}</span>
                <span className="text-[10px] font-medium uppercase tracking-wide text-[var(--faint)]">
                  {d.higherIsBetter ? "Higher is better" : "Context-dependent"}
                </span>
              </div>
              {d.formula && (
                <p className="mt-1 font-mono text-[11px] text-[var(--muted)]">
                  {d.formula}
                </p>
              )}
              <p className="mt-1.5 max-w-3xl text-[13px] leading-relaxed text-[var(--foreground)]">
                {d.howToUse}
              </p>
              {d.benchmark && (
                <p className="mt-1 text-[12px] text-[var(--muted)]">
                  <span className="font-medium text-[var(--foreground)]">
                    Benchmark:{" "}
                  </span>
                  {d.benchmark}
                </p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-[11px] text-[var(--muted)] print:hidden">
        Advanced rates are computed from season totals (true shooting, eFG%,
        turnover %, free-throw and three-point rates, AST/TO, traditional EFF,
        stocks). Not pace- or opponent-adjusted.
      </p>
    </div>
  );
}

export function AdvancedStatsClient(props: {
  players: PlayerSeasonStats[];
  season: string;
  positions: string[];
}) {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-[var(--muted)]">Loading advanced stats…</div>
      }
    >
      <AdvancedInner {...props} />
    </Suspense>
  );
}

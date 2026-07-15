"use client";

import { Suspense, useMemo } from "react";
import Link from "next/link";
import type { PlayerSeasonStats, TeamAbbr } from "@/lib/types";
import { TEAMS } from "@/lib/teams";
import { formatNum, formatPct } from "@/lib/format";
import { useUrlFilters } from "@/lib/urlState";
import { useTableDensity } from "@/lib/tablePrefs";
import { positionFilterLabel, positionMatches } from "@/lib/positions";
import {
  BASIC_STAT_MIN_FILTERS,
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

const STAT_MIN_KEYS = new Set(BASIC_STAT_MIN_FILTERS.map((d) => d.key));

const FILTER_DEFAULTS: Record<string, string> = {
  q: "",
  team: "",
  pos: "",
  gp: "10",
  sort: "pts",
  dir: "desc",
  ...minFilterDefaults(BASIC_STAT_MIN_FILTERS),
};

const FILTER_LABELS: Record<string, string> = {
  q: "Player",
  team: "Team",
  pos: "Pos",
  gp: "Min GP",
  sort: "Sort",
  dir: "Dir",
  ...minFilterLabels(BASIC_STAT_MIN_FILTERS),
};

function StatsInner({
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
    if (c.key === "gp" && c.value === "10") return false;
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
      if (!passesStatMinFilters(p, BASIC_STAT_MIN_FILTERS, values)) return false;
      return true;
    });
  }, [players, q, team, pos, minGp, values]);

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
      // Priority columns: GP, PPG, RPG, STL, BLK, FG%, 3P%, TS%
      {
        key: "gp",
        header: "GP",
        sortable: true,
        sortValue: (r) => r.gp,
        align: "right",
        className: "tabular-nums",
        render: (r) => r.gp || "—",
      },
      {
        key: "pts",
        header: "PPG",
        sortable: true,
        sortValue: (r) => r.pts,
        align: "right",
        className: "tabular-nums font-semibold",
        render: (r) => formatNum(r.pts),
      },
      {
        key: "reb",
        header: "RPG",
        sortable: true,
        sortValue: (r) => r.reb,
        align: "right",
        className: "tabular-nums font-semibold",
        render: (r) => formatNum(r.reb),
      },
      {
        key: "stl",
        header: "STL",
        sortable: true,
        sortValue: (r) => r.stl,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatNum(r.stl),
      },
      {
        key: "blk",
        header: "BLK",
        sortable: true,
        sortValue: (r) => r.blk,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatNum(r.blk),
      },
      {
        key: "fgPct",
        header: "FG%",
        sortable: true,
        sortValue: (r) => r.fgPct,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatPct(r.fgPct),
      },
      {
        key: "threePct",
        header: "3P%",
        sortable: true,
        sortValue: (r) => r.threePct,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatPct(r.threePct),
      },
      {
        key: "tsPct",
        header: "TS%",
        sortable: true,
        sortValue: (r) => r.tsPct,
        align: "right",
        className: "tabular-nums font-semibold",
        render: (r) => formatPct(r.tsPct),
      },
      // Everything else
      {
        key: "ast",
        header: "APG",
        sortable: true,
        sortValue: (r) => r.ast,
        align: "right",
        className: "tabular-nums",
        render: (r) => formatNum(r.ast),
      },
      {
        key: "min",
        header: "MIN",
        sortable: true,
        sortValue: (r) => r.min,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.min),
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
      {
        key: "ftPct",
        header: "FT%",
        sortable: true,
        sortValue: (r) => r.ftPct,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatPct(r.ftPct),
      },
      {
        key: "fgm",
        header: "FGM",
        sortable: true,
        sortValue: (r) => r.fgm,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.fgm),
      },
      {
        key: "fga",
        header: "FGA",
        sortable: true,
        sortValue: (r) => r.fga,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.fga),
      },
      {
        key: "threePm",
        header: "3PM",
        sortable: true,
        sortValue: (r) => r.threePm,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.threePm),
      },
      {
        key: "ftm",
        header: "FTM",
        sortable: true,
        sortValue: (r) => r.ftm,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.ftm),
      },
      {
        key: "pf",
        header: "PF",
        sortable: true,
        sortValue: (r) => r.pf,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => formatNum(r.pf),
      },
      {
        key: "dd2",
        header: "DD2",
        sortable: true,
        sortValue: (r) => r.dd2,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => r.dd2 || "—",
      },
      {
        key: "td3",
        header: "TD3",
        sortable: true,
        sortValue: (r) => r.td3,
        align: "right",
        className: "tabular-nums text-[var(--muted)]",
        render: (r) => r.td3 || "—",
      },
    ],
    []
  );

  const leaders = useMemo(() => {
    const withPts = filtered.filter((p) => p.pts != null);
    const topPts = [...withPts].sort((a, b) => (b.pts ?? 0) - (a.pts ?? 0))[0];
    const topReb = [...filtered]
      .filter((p) => p.reb != null)
      .sort((a, b) => (b.reb ?? 0) - (a.reb ?? 0))[0];
    const topAst = [...filtered]
      .filter((p) => p.ast != null)
      .sort((a, b) => (b.ast ?? 0) - (a.ast ?? 0))[0];
    return { topPts, topReb, topAst };
  }, [filtered]);

  const chipDisplay = visibleChips.map((c) => {
    if (c.key === "gp") return { ...c, display: `${c.value}+ games` };
    if (STAT_MIN_KEYS.has(c.key)) {
      return { ...c, display: formatMinFilterChip(c.value) };
    }
    return c;
  });

  return (
    <div>
      <PageHeader
        title="Player Stats"
        description={`${season} regular season per-game averages. Click any column header to sort. For efficiency metrics and how to read them, open Advanced Stats.`}
      >
        <Link
          href="/stats/advanced"
          className="inline-flex items-center rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
        >
          Advanced stats →
        </Link>
        <ExportButton
          filename={`nba-stats-${season}.csv`}
          headers={[
            "player",
            "team",
            "pos",
            "age",
            "gp",
            "ppg",
            "rpg",
            "stl",
            "blk",
            "fg_pct",
            "3p_pct",
            "ts_pct",
            "apg",
            "min",
            "tov",
            "ft_pct",
            "fgm",
            "fga",
            "3pm",
            "3pa",
            "ftm",
            "fta",
            "pf",
            "dd2",
            "td3",
          ]}
          rows={filtered.map((p) => [
            p.player,
            p.team,
            p.position,
            p.age,
            p.gp,
            p.pts,
            p.reb,
            p.stl,
            p.blk,
            p.fgPct,
            p.threePct,
            p.tsPct,
            p.ast,
            p.min,
            p.tov,
            p.ftPct,
            p.fgm,
            p.fga,
            p.threePm,
            p.threePa,
            p.ftm,
            p.fta,
            p.pf,
            p.dd2,
            p.td3,
          ])}
        />
      </PageHeader>

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Players shown" value={filtered.length} />
        <StatCard
          label="PTS leader"
          value={
            leaders.topPts
              ? `${formatNum(leaders.topPts.pts)}`
              : "—"
          }
          hint={leaders.topPts?.player}
        />
        <StatCard
          label="REB leader"
          value={
            leaders.topReb
              ? `${formatNum(leaders.topReb.reb)}`
              : "—"
          }
          hint={leaders.topReb?.player}
        />
        <StatCard
          label="AST leader"
          value={
            leaders.topAst
              ? `${formatNum(leaders.topAst.ast)}`
              : "—"
          }
          hint={leaders.topAst?.player}
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
          {BASIC_STAT_MIN_FILTERS.map((def) => (
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
        sortKey={sort || "pts"}
        sortDir={(dir === "asc" || dir === "desc" ? dir : "desc") as SortDir}
        onSortChange={(key, nextDir) => setFilters({ sort: key, dir: nextDir })}
        compact={compact}
        totalCount={players.length}
        emptyMessage="No players match these filters."
        emptyActionLabel="Clear all filters"
        onEmptyAction={clearFilters}
      />
      <p className="mt-2 text-[11px] text-[var(--muted)] print:hidden">
        Per-game averages for the {season} regular season. Sort and filters sync to
        the URL.
      </p>
    </div>
  );
}

export function StatsClient(props: {
  players: PlayerSeasonStats[];
  season: string;
  positions: string[];
}) {
  return (
    <Suspense
      fallback={<div className="text-sm text-[var(--muted)]">Loading stats…</div>}
    >
      <StatsInner {...props} />
    </Suspense>
  );
}

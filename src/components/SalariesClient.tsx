"use client";

import { Suspense, useMemo, useState } from "react";
import type { CapThresholds, PlayerContract, TeamAbbr } from "@/lib/types";
import { TEAMS } from "@/lib/teams";
import { formatMoney, formatPct } from "@/lib/format";
import { pctOfCapForSeason } from "@/lib/data";
import { useUrlFilters } from "@/lib/urlState";
import { useTableDensity } from "@/lib/tablePrefs";
import { positionFilterLabel, positionMatches } from "@/lib/positions";
import type { SortDir } from "./DataTable";
import { DataTable, type Column } from "./DataTable";
import { Field, FilterBar, PageHeader, SearchInput, SelectInput, StatCard } from "./Filters";
import { TeamChip } from "./TeamLogo";
import { OptionBadge } from "./Badge";
import { ExportButton } from "./ExportButton";
import { DensityToggle } from "./DensityToggle";
import { SavedViewsBar } from "./SavedViews";
import { PlayerDrawer, PlayerNameButton } from "./PlayerDrawer";

function isFaRelevantOption(option: string) {
  return (
    option === "player" ||
    option === "team" ||
    option === "ufa" ||
    option === "rfa"
  );
}

const FILTER_LABELS = {
  q: "Player",
  team: "Team",
  status: "Status",
  season: "Season",
  pos: "Pos",
  age: "Age",
  sort: "Sort",
  dir: "Dir",
};

function SalariesInner({
  contracts,
  season,
  cap,
  positions,
}: {
  contracts: PlayerContract[];
  season: string;
  cap: CapThresholds;
  positions: string[];
}) {
  const { values, setFilter, setFilters, clearFilters, clearFilter, hasActive, chips, queryString, pathname } =
    useUrlFilters(
      {
        q: "",
        team: "",
        status: "",
        season: season,
        pos: "",
        age: "",
        sort: "salary",
        dir: "desc",
      },
      FILTER_LABELS
    );
  const { q, team, status, season: seasonFilter, pos, age, sort, dir } = values;
  const { density, compact, setDensity } = useTableDensity();
  const [selected, setSelected] = useState<PlayerContract | null>(null);

  const visibleChips = chips.filter((c) => {
    if (c.key === "sort" || c.key === "dir") return false;
    if (c.key === "season" && c.value === season) return false;
    return true;
  });

  const seasons = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach((c) => c.salaries.forEach((s) => set.add(s.season)));
    return [...set].sort().map((s) => ({ value: s, label: s }));
  }, [contracts]);

  const teamOpts = TEAMS.map((t) => ({
    value: t.abbr,
    label: `${t.abbr} — ${t.name}`,
  }));

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return contracts.filter((c) => {
      if (team && c.team !== team) return false;
      if (pos && !positionMatches(pos, c.position)) return false;
      if (age === "u25" && (c.age == null || c.age >= 25)) return false;
      if (age === "25-29" && (c.age == null || c.age < 25 || c.age > 29)) return false;
      if (age === "30+" && (c.age == null || c.age < 30)) return false;
      if (query && !c.player.toLowerCase().includes(query)) return false;
      if (status === "po" && !c.salaries.some((s) => s.option === "player")) return false;
      if (status === "to" && !c.salaries.some((s) => s.option === "team")) return false;
      if (status === "ufa" && c.freeAgencyType !== "UFA") return false;
      if (status === "rfa" && c.freeAgencyType !== "RFA") return false;
      if (status === "notes" && !(c.notes?.length > 0)) return false;
      if (status === "fa-soon") {
        return (
          c.freeAgencyYear === seasonFilter ||
          c.salaries.some(
            (s) => s.season === seasonFilter && isFaRelevantOption(s.option)
          )
        );
      }
      if (seasonFilter) {
        const hasSeasonRow = c.salaries.some(
          (s) =>
            s.season === seasonFilter &&
            (s.amount != null ||
              s.option === "ufa" ||
              s.option === "rfa" ||
              s.option === "player" ||
              s.option === "team")
        );
        if (!hasSeasonRow) return false;
      }
      return true;
    });
  }, [contracts, q, team, status, seasonFilter, pos, age]);

  const columns: Column<PlayerContract>[] = [
    {
      key: "player",
      header: "Player",
      sticky: true,
      sortable: true,
      sortValue: (r) => r.player,
      className: "font-semibold min-w-[150px]",
      render: (r) => (
        <div>
          <PlayerNameButton
            player={r}
            onOpen={setSelected}
            subtitle={
              <>
                {r.position || "—"}
                {r.age != null ? ` · ${r.age}` : ""}
              </>
            }
          />
          {r.notes?.length > 0 && (
            <div
              className="text-[10px] text-[var(--warn)] font-normal truncate max-w-[180px]"
              title={r.notes.join("; ")}
            >
              {r.notes[0]}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "team",
      header: "Team",
      sortable: true,
      sortValue: (r) => r.team,
      render: (r) => <TeamChip abbr={r.team as TeamAbbr} />,
    },
    {
      key: "salary",
      header: (
        <span>
          Salary
          <span className="block text-[9px] normal-case font-normal tracking-normal text-[var(--muted)]">
            {seasonFilter}
          </span>
        </span>
      ),
      sortable: true,
      sortValue: (r) => {
        const y = r.salaries.find((s) => s.season === seasonFilter);
        return y?.amount ?? r.currentSalary ?? null;
      },
      align: "right",
      className: "tabular-nums font-semibold whitespace-nowrap",
      render: (r) => {
        const y = r.salaries.find((s) => s.season === seasonFilter);
        if (!y) return formatMoney(r.currentSalary);
        const isFaOnly =
          y.amount == null && (y.option === "ufa" || y.option === "rfa");
        const pct = pctOfCapForSeason(r, seasonFilter, cap);
        return (
          <span className="inline-flex flex-col items-end gap-0.5">
            <span className="inline-flex items-center gap-1.5">
              {y.amount != null ? formatMoney(y.amount) : isFaOnly ? "—" : y.display}
              {!isFaOnly && <OptionBadge option={y.option} />}
            </span>
            {pct != null && y.amount != null && (
              <span className="text-[10px] font-normal text-[var(--muted)]">
                {formatPct(pct)} cap
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "years",
      header: "Yrs",
      sortable: true,
      sortValue: (r) => r.contractYears,
      align: "right",
      className: "tabular-nums",
      render: (r) => r.contractYears || "—",
    },
    {
      key: "guaranteed",
      header: "Guaranteed*",
      sortable: true,
      sortValue: (r) => r.guaranteed ?? null,
      align: "right",
      className: "tabular-nums whitespace-nowrap",
      render: (r) => formatMoney(r.guaranteed, true),
    },
    {
      key: "options",
      header: "Options",
      render: (r) => {
        const opts = r.salaries.filter((s) =>
          ["player", "team", "non-guaranteed"].includes(s.option)
        );
        if (!opts.length) return <span className="text-[var(--muted)]">—</span>;
        return (
          <span className="flex flex-wrap gap-1">
            {opts.map((s) => (
              <span key={s.season} className="inline-flex items-center gap-1 text-xs">
                <OptionBadge option={s.option} />
                <span className="text-[var(--muted)]">{s.season}</span>
              </span>
            ))}
          </span>
        );
      },
    },
    {
      key: "fa",
      header: "Free agency",
      sortable: true,
      sortValue: (r) => r.freeAgencyYear ?? "",
      render: (r) =>
        r.freeAgencyYear ? (
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="font-semibold tabular-nums">{r.freeAgencyYear}</span>
            {r.freeAgencyType && (
              <OptionBadge option={r.freeAgencyType === "UFA" ? "ufa" : "rfa"} />
            )}
          </span>
        ) : (
          <span className="text-[var(--muted)]">—</span>
        ),
    },
  ];

  const total = filtered.reduce((sum, c) => {
    const y = c.salaries.find((s) => s.season === seasonFilter);
    return sum + (y?.amount ?? 0);
  }, 0);

  const upcomingFa = filtered.filter(
    (c) =>
      c.freeAgencyYear === seasonFilter ||
      c.salaries.some(
        (s) => s.season === seasonFilter && isFaRelevantOption(s.option)
      )
  ).length;

  const chipDisplay = visibleChips.map((c) => {
    let display = c.display;
    if (c.key === "status") {
      const map: Record<string, string> = {
        po: "Player option",
        to: "Team option",
        ufa: "UFA",
        rfa: "RFA",
        "fa-soon": "FA this season",
        notes: "Has notes",
      };
      display = map[c.value] ?? c.value;
    }
    if (c.key === "age") {
      const map: Record<string, string> = {
        u25: "Under 25",
        "25-29": "25–29",
        "30+": "30+",
      };
      display = map[c.value] ?? c.value;
    }
    return { ...c, display };
  });

  return (
    <div>
      <PageHeader
        title="Player Salaries"
        description="Click a player for the full year grid. Filters and sort sync to the URL — shareable and saveable."
      >
        <DensityToggle density={density} onChange={setDensity} />
        <SavedViewsBar path={pathname} queryString={queryString} />
        <ExportButton
          filename="nba-salaries.csv"
          headers={[
            "player",
            "team",
            "pos",
            "age",
            "season",
            "salary",
            "pct_cap",
            "years",
            "guaranteed",
            "fa_year",
            "fa_type",
            "notes",
          ]}
          rows={filtered.map((c) => {
            const y = c.salaries.find((s) => s.season === seasonFilter);
            return [
              c.player,
              c.team,
              c.position,
              c.age,
              seasonFilter,
              y?.amount ?? c.currentSalary,
              pctOfCapForSeason(c, seasonFilter, cap),
              c.contractYears,
              c.guaranteed,
              c.freeAgencyYear,
              c.freeAgencyType,
              c.notes?.join("; "),
            ];
          })}
        />
      </PageHeader>

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Players shown" value={filtered.length} />
        <StatCard label={`${seasonFilter} payroll`} value={formatMoney(total, true)} />
        <StatCard
          label="With player options"
          value={filtered.filter((c) => c.salaries.some((s) => s.option === "player")).length}
        />
        <StatCard label="Upcoming FA / options" value={upcomingFa} />
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
          <Field label="Age">
            <SelectInput
              value={age}
              onChange={(v) => setFilter("age", v)}
              options={[
                { value: "u25", label: "Under 25" },
                { value: "25-29", label: "25–29" },
                { value: "30+", label: "30+" },
              ]}
              placeholder="All ages"
            />
          </Field>
          <Field label="Season">
            <SelectInput
              value={seasonFilter}
              onChange={(v) => setFilter("season", v)}
              options={seasons}
              placeholder="Season"
            />
          </Field>
          <Field label="Status">
            <SelectInput
              value={status}
              onChange={(v) => setFilter("status", v)}
              options={[
                { value: "po", label: "Player option" },
                { value: "to", label: "Team option" },
                { value: "ufa", label: "UFA" },
                { value: "rfa", label: "RFA" },
                { value: "fa-soon", label: "FA this season" },
                { value: "notes", label: "Has notes" },
              ]}
              placeholder="All statuses"
            />
          </Field>
        </FilterBar>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => `${r.id}-${r.team}`}
        sortKey={sort || "salary"}
        sortDir={(dir === "asc" || dir === "desc" ? dir : "desc") as SortDir}
        onSortChange={(key, nextDir) => setFilters({ sort: key, dir: nextDir })}
        compact={compact}
        totalCount={contracts.length}
        emptyMessage="No players match these filters."
        emptyActionLabel="Clear all filters"
        onEmptyAction={clearFilters}
      />
      <p className="mt-2 text-[11px] text-[var(--muted)] print:hidden">
        * Guaranteed total is an estimate from remaining listed years. Click a name for the
        full contract. Sort is stored in the URL.
      </p>

      <PlayerDrawer
        player={selected}
        season={season}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export function SalariesClient(props: {
  contracts: PlayerContract[];
  season: string;
  cap: CapThresholds;
  positions: string[];
}) {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading salaries…</div>}>
      <SalariesInner {...props} />
    </Suspense>
  );
}

"use client";

import { Suspense, useMemo, useState } from "react";
import type { PlayerContract, TeamAbbr } from "@/lib/types";
import { TEAMS } from "@/lib/teams";
import { formatMoney } from "@/lib/format";
import {
  NO_FA_BUCKET,
  TWO_WAY_BUCKET,
  ageAtFa,
  effectiveFreeAgencyType,
  effectiveFreeAgencyYear,
  faCapHold,
  groupFreeAgents,
  lastSalaryBeforeFa,
  timingOptions,
} from "@/lib/freeAgency";
import { useUrlFilters } from "@/lib/urlState";
import { useTableDensity } from "@/lib/tablePrefs";
import { positionFilterLabel, positionMatches } from "@/lib/positions";
import { matchesSearch } from "@/lib/ux";
import { DataTable, type Column, type SortDir } from "./DataTable";
import {
  Field,
  FilterBar,
  PageHeader,
  SearchInput,
  SegmentedControl,
  SelectInput,
  StatCard,
} from "./Filters";
import { TeamChip } from "./TeamLogo";
import { OptionBadge } from "./Badge";
import { ExportButton } from "./ExportButton";
import { DensityToggle } from "./DensityToggle";
import { SavedViewsBar } from "./SavedViews";
import { PlayerDrawer, PlayerNameButton } from "./PlayerDrawer";
import { useModShortcut } from "@/lib/useModShortcut";

type TypeFilter = "all" | "ufa" | "rfa";

function yearLabel(y: string) {
  if (y === NO_FA_BUCKET) return "Unscheduled";
  if (y === TWO_WAY_BUCKET) return "Two-Way";
  return y;
}

function FreeAgentsInner({
  contracts,
  season,
  positions,
}: {
  contracts: PlayerContract[];
  season: string;
  positions: string[];
}) {
  const groups = useMemo(
    () => groupFreeAgents(contracts, season),
    [contracts, season]
  );

  const years = useMemo(
    () =>
      groups
        .map((g) => g.year)
        .filter((y) => y !== NO_FA_BUCKET && y !== TWO_WAY_BUCKET),
    [groups]
  );

  // Start on the roll-up view; a specific class is still selected whenever
  // it is supplied in the URL (for example, /free-agents?view=2027).
  const defaultView = "overview";
  const {
    values,
    setFilter,
    setFilters,
    clearFilter,
    chips,
    queryString,
    pathname,
  } = useUrlFilters(
    {
      view: defaultView,
      type: "all",
      q: "",
      team: "",
      pos: "",
      age: "",
      sort: "hold",
      dir: "desc",
    },
    {
      view: "Class",
      type: "Type",
      q: "Player",
      team: "Team",
      pos: "Pos",
      age: "Age",
      sort: "Sort",
      dir: "Dir",
    }
  );

  const view = values.view || defaultView;
  const type = (values.type || "all") as TypeFilter;
  const { q, team, pos, age, sort, dir } = values;
  const { density, compact, setDensity } = useTableDensity();
  const [selected, setSelected] = useState<PlayerContract | null>(null);

  const filterChips = chips.filter((c) => {
    if (c.key === "sort" || c.key === "dir" || c.key === "view") return false;
    if (c.key === "type" && c.value === "all") return false;
    return true;
  });

  const teamOpts = TEAMS.map((t) => ({
    value: t.abbr,
    label: `${t.abbr} — ${t.name}`,
  }));

  const activeGroup = useMemo(
    () => groups.find((g) => g.year === view) ?? null,
    [groups, view]
  );

  const filteredPlayers = useMemo(() => {
    if (!activeGroup) return [];
    return activeGroup.contracts.filter((c) => {
      if (team && c.team !== team) return false;
      if (pos && !positionMatches(pos, c.position)) return false;
      if (age === "u25" && (c.age == null || c.age >= 25)) return false;
      if (age === "25-29" && (c.age == null || c.age < 25 || c.age > 29))
        return false;
      if (age === "30+" && (c.age == null || c.age < 30)) return false;
      if (type === "ufa" && effectiveFreeAgencyType(c) !== "UFA") return false;
      if (type === "rfa" && effectiveFreeAgencyType(c) !== "RFA") return false;
      if (!matchesSearch(q, c.player, c.team)) return false;
      return true;
    });
  }, [activeGroup, q, team, type, pos, age]);

  const overviewColumns: Column<(typeof groups)[number]>[] = [
    {
      key: "year",
      header: "Class",
      sortable: true,
      sortValue: (r) => r.year,
      className: "font-semibold",
      render: (r) => (
        <button
          type="button"
          onClick={() => setFilter("view", r.year)}
          className="text-left font-semibold hover:text-[var(--accent)] transition-colors"
        >
          {yearLabel(r.year)}
        </button>
      ),
    },
    {
      key: "total",
      header: "Players",
      sortable: true,
      sortValue: (r) => r.contracts.length,
      align: "right",
      className: "tabular-nums font-semibold",
      render: (r) => r.contracts.length,
    },
    {
      key: "ufa",
      header: "UFA",
      sortable: true,
      sortValue: (r) => r.ufAs.length,
      align: "right",
      className: "tabular-nums",
      render: (r) => r.ufAs.length,
    },
    {
      key: "rfa",
      header: "RFA",
      sortable: true,
      sortValue: (r) => r.rfAs.length,
      align: "right",
      className: "tabular-nums",
      render: (r) => r.rfAs.length,
    },
    {
      key: "hold",
      header: "Cap holds*",
      sortable: true,
      sortValue: (r) => r.totalCapHold,
      align: "right",
      className: "tabular-nums font-semibold whitespace-nowrap",
      render: (r) =>
        r.year === NO_FA_BUCKET || r.year === TWO_WAY_BUCKET
          ? "—"
          : formatMoney(r.totalCapHold, true),
    },
    {
      key: "headliners",
      header: "Headliners",
      className: "text-[var(--muted)] text-xs min-w-[180px]",
      render: (r) =>
        r.headliners.length
          ? r.headliners.map((c) => c.player).join(" · ")
          : "—",
    },
  ];

  const playerColumns: Column<PlayerContract>[] = [
    {
      key: "player",
      header: "Player",
      sticky: true,
      sortable: true,
      sortValue: (r) => r.player,
      className: "font-semibold min-w-[140px]",
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
              className="text-[10px] text-[var(--warn)] font-normal truncate max-w-[160px]"
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
      key: "ageFa",
      header: "Age @ FA",
      sortable: true,
      sortValue: (r) => ageAtFa(r, season, effectiveFreeAgencyYear(r)) ?? -1,
      align: "right",
      className: "tabular-nums",
      render: (r) => {
        const a = ageAtFa(r, season, effectiveFreeAgencyYear(r));
        return a != null ? a : "—";
      },
    },
    {
      key: "salary",
      header: (
        <span>
          Last salary
          <span className="block text-[9px] normal-case font-normal tracking-normal text-[var(--muted)]">
            before FA
          </span>
        </span>
      ),
      sortable: true,
      sortValue: (r) =>
        lastSalaryBeforeFa(r, effectiveFreeAgencyYear(r)) ?? null,
      align: "right",
      className: "tabular-nums font-semibold whitespace-nowrap",
      render: (r) =>
        formatMoney(lastSalaryBeforeFa(r, effectiveFreeAgencyYear(r))),
    },
    {
      key: "hold",
      header: (
        <span>
          Cap hold
          <span className="block text-[9px] normal-case font-normal tracking-normal text-[var(--muted)]">
            est.
          </span>
        </span>
      ),
      sortable: true,
      sortValue: (r) => faCapHold(r).amount ?? null,
      align: "right",
      className: "tabular-nums whitespace-nowrap",
      render: (r) => {
        const hold = faCapHold(r);
        return hold.amount != null ? formatMoney(hold.amount, true) : "—";
      },
    },
    {
      key: "type",
      header: "Type",
      sortable: true,
      sortValue: (r) => effectiveFreeAgencyType(r) ?? "",
      render: (r) => {
        const t = effectiveFreeAgencyType(r);
        if (!t) return <span className="text-[var(--muted)]">—</span>;
        return <OptionBadge option={t === "UFA" ? "ufa" : "rfa"} />;
      },
    },
    {
      key: "options",
      header: "Options before FA",
      render: (r) => {
        const opts = timingOptions(r, effectiveFreeAgencyYear(r));
        if (!opts.length) return <span className="text-[var(--muted)]">—</span>;
        return (
          <span className="flex flex-wrap gap-1">
            {opts.map((s) => (
              <span
                key={`${s.season}-${s.option}`}
                className="inline-flex items-center gap-1 text-xs"
              >
                <OptionBadge option={s.option} />
                <span className="text-[var(--muted)]">{s.season}</span>
              </span>
            ))}
          </span>
        );
      },
    },
  ];

  const totalHoldInView = filteredPlayers.reduce(
    (sum, c) => sum + (faCapHold(c).amount ?? 0),
    0
  );
  const ufaInView = filteredPlayers.filter(
    (c) => effectiveFreeAgencyType(c) === "UFA"
  ).length;
  const rfaInView = filteredPlayers.filter(
    (c) => effectiveFreeAgencyType(c) === "RFA"
  ).length;

  const overviewStats = useMemo(() => {
    const scheduled = groups.filter(
      (g) => g.year !== NO_FA_BUCKET && g.year !== TWO_WAY_BUCKET
    );
    return {
      classes: scheduled.length,
      players: scheduled.reduce((s, g) => s + g.contracts.length, 0),
      ufa: scheduled.reduce((s, g) => s + g.ufAs.length, 0),
      rfa: scheduled.reduce((s, g) => s + g.rfAs.length, 0),
    };
  }, [groups]);

  // Next FA class for "Expiring" highlight
  const nextClass = years[0];
  const expiring = useMemo(() => {
    if (!nextClass) return [];
    return (
      groups
        .find((g) => g.year === nextClass)
        ?.contracts.slice()
        .sort(
          (a, b) =>
            (lastSalaryBeforeFa(b, nextClass) ?? 0) -
            (lastSalaryBeforeFa(a, nextClass) ?? 0)
        )
        .slice(0, 8) ?? []
    );
  }, [groups, nextClass]);

  const isSpecial =
    view === NO_FA_BUCKET || view === TWO_WAY_BUCKET || view === "overview";
  const { shortcut } = useModShortcut();

  return (
    <div>
      <PageHeader
        title="Free Agent Classes"
        description={`Who becomes free each offseason — UFA vs RFA, estimated cap holds, option timing. Click a player for the full contract. ${shortcut} to search.`}
      >
        <DensityToggle density={density} onChange={setDensity} />
        <SavedViewsBar path={pathname} queryString={queryString} />
        {view !== "overview" && activeGroup && (
          <ExportButton
            filename={`fa-${view.replace(/\s+/g, "-").toLowerCase()}.csv`}
            headers={[
              "player",
              "team",
              "pos",
              "age",
              "age_at_fa",
              "last_salary",
              "cap_hold",
              "type",
              "notes",
            ]}
            rows={filteredPlayers.map((c) => [
              c.player,
              c.team,
              c.position,
              c.age,
              ageAtFa(c, season, effectiveFreeAgencyYear(c)),
              lastSalaryBeforeFa(c, effectiveFreeAgencyYear(c)),
              faCapHold(c).amount,
              effectiveFreeAgencyType(c),
              c.notes?.join("; "),
            ])}
          />
        )}
      </PageHeader>

      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          className="chip"
          data-active={view === "overview"}
          onClick={() => setFilter("view", "overview")}
        >
          Overview
        </button>
        {years.map((y) => {
          const g = groups.find((x) => x.year === y);
          return (
            <button
              key={y}
              type="button"
              className="chip"
              data-active={view === y}
              onClick={() => setFilter("view", y)}
            >
              {y}
              {g && (
                <span className="tabular-nums text-[10px] opacity-70">
                  {g.contracts.length}
                </span>
              )}
            </button>
          );
        })}
        {groups.some((g) => g.year === TWO_WAY_BUCKET) && (
          <button
            type="button"
            className="chip"
            data-active={view === TWO_WAY_BUCKET}
            onClick={() => setFilter("view", TWO_WAY_BUCKET)}
          >
            Two-Way
            <span className="tabular-nums text-[10px] opacity-70">
              {groups.find((g) => g.year === TWO_WAY_BUCKET)?.contracts.length ??
                0}
            </span>
          </button>
        )}
        {groups.some((g) => g.year === NO_FA_BUCKET) && (
          <button
            type="button"
            className="chip"
            data-active={view === NO_FA_BUCKET}
            onClick={() => setFilter("view", NO_FA_BUCKET)}
          >
            Unscheduled
            <span className="tabular-nums text-[10px] opacity-70">
              {groups.find((g) => g.year === NO_FA_BUCKET)?.contracts.length ??
                0}
            </span>
          </button>
        )}
      </div>

      {view === "overview" ? (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard label="Classes tracked" value={overviewStats.classes} />
            <StatCard
              label="Players with FA year"
              value={overviewStats.players}
            />
            <StatCard label="UFA total" value={overviewStats.ufa} />
            <StatCard label="RFA total" value={overviewStats.rfa} />
          </div>

          {nextClass && expiring.length > 0 && (
            <section className="mb-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3">
              <div className="mb-2.5 flex items-center justify-between gap-2">
                <h2 className="text-[13px] font-semibold">
                  Next expiring class · {nextClass}
                </h2>
                <button
                  type="button"
                  className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--accent)]"
                  onClick={() => setFilter("view", nextClass)}
                >
                  View full class →
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {expiring.map((c) => (
                  <div
                    key={c.id}
                    className="rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm truncate">
                        {c.player}
                      </span>
                      {effectiveFreeAgencyType(c) && (
                        <OptionBadge
                          option={
                            effectiveFreeAgencyType(c) === "UFA" ? "ufa" : "rfa"
                          }
                        />
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-[11px] text-[var(--muted)]">
                      <TeamChip abbr={c.team as TeamAbbr} />
                      <span className="tabular-nums font-medium text-[var(--foreground)]">
                        {formatMoney(
                          lastSalaryBeforeFa(c, nextClass) ?? c.currentSalary,
                          true
                        )}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          <DataTable
            rows={groups}
            columns={overviewColumns}
            rowKey={(r) => r.year}
            defaultSortKey="year"
            defaultSortDir="asc"
            emptyMessage="No free-agent class data available."
          />
          <p className="mt-2 text-[11px] text-[var(--muted)]">
            * Cap holds estimated from Spotrac free-agency rows (e.g. “UFA /
            $31.5M”). Click a class to drill in.
          </p>
        </>
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            <StatCard
              label="Players shown"
              value={filteredPlayers.length}
              hint={
                activeGroup
                  ? `${activeGroup.contracts.length} in class`
                  : undefined
              }
            />
            <StatCard label="UFA" value={ufaInView} />
            <StatCard label="RFA" value={rfaInView} />
            <StatCard
              label="Cap holds (est.)"
              value={isSpecial ? "—" : formatMoney(totalHoldInView, true)}
            />
          </div>

          <div className="mb-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                Type
              </span>
              <SegmentedControl<TypeFilter>
                value={type}
                onChange={(v) => setFilter("type", v)}
                options={[
                  { value: "all", label: "All" },
                  { value: "ufa", label: "UFA" },
                  { value: "rfa", label: "RFA" },
                ]}
              />
            </div>
            <FilterBar
              hasActive={filterChips.length > 0 || (type !== "all")}
              onClear={() => {
                setFilters({
                  view,
                  type: "all",
                  q: "",
                  team: "",
                  pos: "",
                  age: "",
                  sort: "hold",
                  dir: "desc",
                });
              }}
              chips={filterChips}
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
            </FilterBar>
          </div>

          <DataTable
            rows={filteredPlayers}
            columns={playerColumns}
            rowKey={(r) => `${r.id}-${r.team}`}
            sortKey={sort || "hold"}
            sortDir={(dir === "asc" || dir === "desc" ? dir : "desc") as SortDir}
            onSortChange={(key, nextDir) => setFilters({ sort: key, dir: nextDir })}
            compact={compact}
            totalCount={activeGroup?.contracts.length}
            emptyMessage={`No free agents in ${yearLabel(view)} match your filters.`}
            emptyActionLabel="Clear filters"
            onEmptyAction={() =>
              setFilters({
                view,
                type: "all",
                q: "",
                team: "",
                pos: "",
                age: "",
              })
            }
          />
          <p className="mt-2 text-[11px] text-[var(--muted)] print:hidden">
            Cap hold is estimated from source display text. Click a player name for
            the full year grid. Sort is stored in the URL.
          </p>
        </>
      )}

      <PlayerDrawer
        player={selected}
        season={season}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

export function FreeAgentClassesClient(props: {
  contracts: PlayerContract[];
  season: string;
  positions: string[];
}) {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-[var(--muted)]">Loading free agents…</div>
      }
    >
      <FreeAgentsInner {...props} />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { useMemo, useState, Suspense } from "react";
import type { CapThresholds, DraftPick, PlayerContract, TeamPayroll } from "@/lib/types";
import { TEAMS, TEAM_BY_ABBR } from "@/lib/teams";
import { formatMoney, formatDelta, formatPct } from "@/lib/format";
import {
  effectivePayroll,
  getApronStatus,
  roomToLine,
} from "@/lib/cap";
import { projectTeamPayroll, draftCapitalMatrix } from "@/lib/data";
import {
  ageAtFa,
  effectiveFreeAgencyType,
  effectiveFreeAgencyYear,
  faCapHold,
} from "@/lib/freeAgency";
import { useUrlFilters } from "@/lib/urlState";
import {
  compareTeamRows,
  defaultDirForTeamSort,
  type SortDir,
} from "@/lib/teamsMetrics";
import { matchesSearch } from "@/lib/ux";
import { Field, FilterBar, PageHeader, SearchInput, SelectInput, SegmentedControl, StatCard } from "./Filters";
import { TeamLogo } from "./TeamLogo";
import { ApronBadge, OptionBadge } from "./Badge";
import { CapScale, TeamCapMeter } from "./CapScale";
import { ExportButton } from "./ExportButton";
import { DataTable, type Column } from "./DataTable";
import { SavedViewsBar } from "./SavedViews";
import { PlayerDrawer, PlayerNameButton } from "./PlayerDrawer";

function TeamsClientInner({
  payrolls,
  cap,
  pickCounts,
  firstRoundCounts,
  weightedAges,
  rosterCounts,
}: {
  payrolls: TeamPayroll[];
  cap: CapThresholds;
  pickCounts: Record<string, number>;
  firstRoundCounts: Record<string, number>;
  weightedAges: Record<string, number | null>;
  rosterCounts: Record<string, number>;
}) {
  const {
    values,
    setFilter,
    setFilters,
    clearFilters,
    clearFilter,
    hasActive,
    chips,
    queryString,
    pathname,
  } = useUrlFilters(
    {
      q: "",
      conf: "",
      sort: "payroll",
      dir: "desc",
    },
    { q: "Search", conf: "Conference", sort: "Sort", dir: "Direction" }
  );
  const { q, conf, sort } = values;
  const dir: SortDir =
    values.dir === "asc" || values.dir === "desc"
      ? values.dir
      : defaultDirForTeamSort(sort);
  const filterChips = chips.filter(
    (c) =>
      !(c.key === "sort" && c.value === "payroll") &&
      !(c.key === "dir" && c.value === defaultDirForTeamSort(sort || "payroll"))
  );

  const rows = useMemo(() => {
    let list = TEAMS.map((t) => {
      const p = payrolls.find((x) => x.team === t.abbr);
      const spending = p ? effectivePayroll(p) : 0;
      const status = getApronStatus(spending, cap);
      return {
        team: t,
        payroll: p,
        spending,
        totalAllocations: p?.totalCap ?? 0,
        active: p?.activeCap ?? 0,
        dead: p?.deadCap ?? 0,
        avgAge: p?.avgAge ?? null,
        weightedAge: weightedAges[t.abbr] ?? null,
        status,
        picks: pickCounts[t.abbr] ?? 0,
        firstRound: firstRoundCounts[t.abbr] ?? 0,
        roster: rosterCounts[t.abbr] ?? p?.playersActive ?? 0,
        roomCap: roomToLine(spending, cap.salaryCap),
        roomTax: roomToLine(spending, cap.luxuryTax),
        roomA1: roomToLine(spending, cap.firstApron),
        roomA2: roomToLine(spending, cap.secondApron),
      };
    });

    if (conf) list = list.filter((r) => r.team.conference === conf);
    if (q.trim()) {
      list = list.filter((r) =>
        matchesSearch(q, r.team.fullName, r.team.abbr, r.team.city, r.team.name)
      );
    }

    list.sort((a, b) =>
      compareTeamRows(
        {
          name: a.team.fullName,
          spending: a.spending,
          roomCap: a.roomCap,
          picks: a.picks,
          firstRound: a.firstRound,
          avgAge: a.avgAge,
          weightedAge: a.weightedAge,
        },
        {
          name: b.team.fullName,
          spending: b.spending,
          roomCap: b.roomCap,
          picks: b.picks,
          firstRound: b.firstRound,
          avgAge: b.avgAge,
          weightedAge: b.weightedAge,
        },
        sort || "payroll",
        dir
      )
    );
    return list;
  }, [
    payrolls,
    cap,
    pickCounts,
    firstRoundCounts,
    weightedAges,
    rosterCounts,
    q,
    conf,
    sort,
    dir,
  ]);

  const statusCounts = useMemo(() => {
    const all = TEAMS.map((t) => {
      const p = payrolls.find((x) => x.team === t.abbr);
      return getApronStatus(p ? effectivePayroll(p) : 0, cap);
    });
    return {
      second: all.filter((s) => s === "second-apron").length,
      first: all.filter((s) => s === "first-apron").length,
      tax: all.filter((s) => s === "tax").length,
      over: all.filter((s) => s === "over-cap").length,
      under: all.filter((s) => s === "under-cap").length,
    };
  }, [payrolls, cap]);

  const exportRows = rows.map((r) => [
    r.team.abbr,
    r.team.fullName,
    r.spending,
    r.active,
    r.dead,
    r.totalAllocations,
    r.avgAge,
    r.weightedAge,
    r.roster,
    r.picks,
    r.firstRound,
    r.status,
  ]);

  const dirLabels =
    sort === "name"
      ? { desc: "Z → A", asc: "A → Z" }
      : { desc: "High → low", asc: "Low → high" };

  return (
    <div>
      <PageHeader
        title="Teams"
        description="League-wide dashboard using active roster + dead money for apron status (not Spotrac total allocations / FA holds). Open a team for multi-year projections and draft capital."
      >
        <SavedViewsBar path={pathname} queryString={queryString} />
        <ExportButton
          filename="nba-teams.csv"
          headers={[
            "abbr",
            "team",
            "spending",
            "active",
            "dead",
            "total_allocations",
            "avg_age",
            "weighted_age",
            "roster",
            "picks",
            "first_round_picks",
            "apron_status",
          ]}
          rows={exportRows}
        />
      </PageHeader>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Salary cap" value={formatMoney(cap.salaryCap, true)} hint={cap.season} />
        <StatCard
          label="2nd apron teams"
          value={statusCounts.second}
          hint={`${statusCounts.first} at 1st · ${statusCounts.tax} tax`}
        />
        <StatCard label="Over cap" value={statusCounts.over + statusCounts.tax + statusCounts.first + statusCounts.second} />
        <StatCard label="Under cap" value={statusCounts.under} />
        <StatCard label="Teams shown" value={rows.length} hint="of 30" />
      </div>

      <div className="mb-4 print:hidden">
        <FilterBar
          hasActive={hasActive}
          onClear={clearFilters}
          chips={filterChips}
          onClearChip={clearFilter}
        >
          <Field label="Search" className="min-w-[200px] flex-[2]">
            <SearchInput
              value={q}
              onChange={(v) => setFilter("q", v)}
              placeholder="Search teams…"
            />
          </Field>
          <Field label="Conference">
            <SelectInput
              value={conf}
              onChange={(v) => setFilter("conf", v)}
              options={[
                { value: "East", label: "East" },
                { value: "West", label: "West" },
              ]}
              placeholder="All conferences"
            />
          </Field>
          <Field label="Sort by">
            <SelectInput
              value={sort}
              onChange={(v) => {
                const next = v || "payroll";
                setFilters({ sort: next, dir: defaultDirForTeamSort(next) });
              }}
              options={[
                { value: "payroll", label: "Payroll" },
                { value: "space", label: "Cap room" },
                { value: "first", label: "1st-round picks" },
                { value: "picks", label: "All draft picks" },
                { value: "wage", label: "Weighted age" },
                { value: "age", label: "Avg age" },
                { value: "name", label: "Name" },
              ]}
              placeholder="Sort"
            />
          </Field>
          <Field label="Direction" className="min-w-[140px] flex-none">
            <div className="pt-0.5">
              <SegmentedControl
                value={dir}
                onChange={(v) => setFilter("dir", v)}
                options={[
                  { value: "desc", label: dirLabels.desc },
                  { value: "asc", label: dirLabels.asc },
                ]}
              />
            </div>
          </Field>
        </FilterBar>
      </div>

      <p className="mb-3 text-[11px] text-[var(--muted)] print:hidden">
        Spending = active + dead. Weighted age = salary-weighted roster age. Apron status
        ignores FA holds / incomplete-roster charges.
      </p>

      {rows.length === 0 && (
        <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] py-10 text-center print:hidden">
          <p className="text-[13px] text-[var(--muted)]">No teams match these filters.</p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-2 text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            Clear all filters
          </button>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => (
          <Link
            key={r.team.abbr}
            href={`/teams/${r.team.abbr.toLowerCase()}`}
            className="group rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3.5 transition-colors hover:border-[var(--border-strong)]"
            style={{
              borderLeftWidth: 3,
              borderLeftColor: r.team.primary,
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
                  style={{ backgroundColor: `${r.team.primary}14` }}
                >
                  <TeamLogo abbr={r.team.abbr} size={28} />
                </div>
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold leading-tight group-hover:text-[var(--accent)] transition-colors truncate">
                    {r.team.fullName}
                  </div>
                  <div className="text-[11px] text-[var(--muted)] truncate">
                    {r.team.conference} · {r.team.division}
                    {r.weightedAge != null
                      ? ` · ${r.weightedAge.toFixed(1)}y wtd`
                      : r.avgAge != null
                        ? ` · ${r.avgAge.toFixed(1)}y`
                        : ""}
                  </div>
                </div>
              </div>
              <ApronBadge status={r.status} />
            </div>

            <div className="mt-3">
              <div className="label-caps">Active + dead</div>
              <div className="mt-0.5 flex items-baseline justify-between gap-2">
                <div className="text-xl font-semibold tabular-nums tracking-tight leading-none">
                  {formatMoney(r.spending, true)}
                </div>
                <div
                  className={`text-[12px] font-semibold tabular-nums ${r.roomTax >= 0 ? "text-pos" : "text-neg"}`}
                >
                  {formatDelta(r.roomTax)}
                  <span className="ml-1 text-[10px] font-normal text-[var(--muted)]">vs tax</span>
                </div>
              </div>
            </div>

            <TeamCapMeter payroll={r.spending} cap={cap} className="mt-3" />

            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)]">
              <span>
                Roster{" "}
                <b className="font-semibold text-[var(--foreground)] tabular-nums">{r.roster}</b>
              </span>
              <span title="First-round picks owned">
                1st{" "}
                <b className="font-semibold text-[var(--foreground)] tabular-nums">
                  {r.firstRound}
                </b>
              </span>
              <span title="All draft picks owned">
                Picks{" "}
                <b className="font-semibold text-[var(--foreground)] tabular-nums">{r.picks}</b>
              </span>
              {r.weightedAge != null && (
                <span title="Salary-weighted average age">
                  Wtd age{" "}
                  <b className="font-semibold text-[var(--foreground)] tabular-nums">
                    {r.weightedAge.toFixed(1)}
                  </b>
                </span>
              )}
              {r.dead > 0 && (
                <span className="text-neg">
                  Dead {formatMoney(r.dead, true)}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export function TeamsClient(props: {
  payrolls: TeamPayroll[];
  cap: CapThresholds;
  pickCounts: Record<string, number>;
  firstRoundCounts: Record<string, number>;
  weightedAges: Record<string, number | null>;
  rosterCounts: Record<string, number>;
}) {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading teams…</div>}>
      <TeamsClientInner {...props} />
    </Suspense>
  );
}

export function TeamDashboard({
  abbr,
  payroll,
  cap,
  contracts,
  picks,
  currentSeason,
}: {
  abbr: string;
  payroll: TeamPayroll | undefined;
  cap: CapThresholds;
  contracts: PlayerContract[];
  picks: DraftPick[];
  currentSeason: string;
}) {
  const [selected, setSelected] = useState<PlayerContract | null>(null);
  const team = TEAM_BY_ABBR[abbr.toUpperCase() as keyof typeof TEAM_BY_ABBR];
  if (!team) return <div>Team not found</div>;

  const spending = payroll
    ? effectivePayroll(payroll)
    : contracts.reduce((s, c) => {
        const y = c.salaries.find((x) => x.season === currentSeason && x.amount != null);
        return s + (y?.amount ?? c.currentSalary ?? 0);
      }, 0);
  const status = getApronStatus(spending, cap);
  const projections = projectTeamPayroll(team.abbr);
  const matrix = draftCapitalMatrix(picks, team.abbr);

  const fa = contracts
    .filter((c) => effectiveFreeAgencyYear(c) != null)
    .sort((a, b) => {
      const ya = effectiveFreeAgencyYear(a)!;
      const yb = effectiveFreeAgencyYear(b)!;
      return ya.localeCompare(yb) || (b.currentSalary ?? 0) - (a.currentSalary ?? 0);
    })
    .slice(0, 12);

  const rosterColumns: Column<PlayerContract>[] = [
    {
      key: "player",
      header: "Player",
      sticky: true,
      sortable: true,
      sortValue: (r) => r.player,
      className: "font-medium min-w-[130px]",
      render: (r) => (
        <div>
          <PlayerNameButton player={r} onOpen={setSelected} />
          {r.notes?.length > 0 && (
            <div className="text-[10px] text-[var(--warn)] truncate max-w-[160px]" title={r.notes.join("; ")}>
              {r.notes[0]}
            </div>
          )}
        </div>
      ),
    },
    {
      key: "pos",
      header: "Pos",
      sortable: true,
      sortValue: (r) => r.position,
      className: "text-[var(--muted)]",
      render: (r) => r.position || "—",
    },
    {
      key: "age",
      header: "Age",
      sortable: true,
      sortValue: (r) => r.age ?? null,
      align: "right",
      className: "tabular-nums",
      render: (r) => r.age ?? "—",
    },
    {
      key: "salary",
      header: currentSeason,
      sortable: true,
      sortValue: (r) => {
        const y = r.salaries.find((s) => s.season === currentSeason);
        return y?.amount ?? r.currentSalary ?? null;
      },
      align: "right",
      className: "tabular-nums font-semibold whitespace-nowrap",
      render: (r) => {
        const y = r.salaries.find((s) => s.season === currentSeason);
        const amt = y?.amount ?? r.currentSalary;
        const pct = y?.pctOfCap;
        return (
          <span>
            {formatMoney(amt)}
            {pct != null && (
              <span className="ml-1 text-[10px] font-normal text-[var(--muted)]">
                {formatPct(pct)}
              </span>
            )}
          </span>
        );
      },
    },
    {
      key: "fa",
      header: "FA",
      sortable: true,
      sortValue: (r) => effectiveFreeAgencyYear(r) ?? "",
      render: (r) => {
        const y = effectiveFreeAgencyYear(r);
        const t = effectiveFreeAgencyType(r);
        if (!y) return <span className="text-[var(--muted)]">—</span>;
        return (
          <span className="inline-flex items-center gap-1 text-xs">
            <span className="tabular-nums">{y}</span>
            {t && <OptionBadge option={t === "UFA" ? "ufa" : "rfa"} />}
          </span>
        );
      },
    },
  ];

  return (
    <div>
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-sm)]"
            style={{ backgroundColor: `${team.primary}14` }}
          >
            <TeamLogo abbr={team.abbr} size={32} />
          </div>
          <div>
            <Link
              href="/teams"
              className="text-xs font-medium text-[var(--muted)] hover:text-[var(--accent)]"
            >
              ← All teams
            </Link>
            <h1 className="text-xl font-semibold tracking-tight sm:text-[1.35rem]">{team.fullName}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <ApronBadge status={status} />
              <span className="text-sm text-[var(--muted)]">
                {team.conference} · {team.division}
                {payroll?.avgAge != null ? ` · ${payroll.avgAge.toFixed(1)} avg age` : ""}
              </span>
            </div>
          </div>
        </div>
        <ExportButton
          filename={`${team.abbr.toLowerCase()}-roster.csv`}
          headers={["player", "pos", "age", "salary", "fa_year", "fa_type", "notes"]}
          rows={contracts.map((c) => {
            const y = c.salaries.find((s) => s.season === currentSeason);
            return [
              c.player,
              c.position,
              c.age,
              y?.amount ?? c.currentSalary,
              effectiveFreeAgencyYear(c),
              effectiveFreeAgencyType(c),
              c.notes?.join("; "),
            ];
          })}
        />
      </div>

      <p className="mb-3 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-[13px]">
        <span
          className={`font-semibold tabular-nums ${roomToLine(spending, cap.secondApron) >= 0 ? "text-pos" : "text-neg"}`}
        >
          {formatDelta(roomToLine(spending, cap.secondApron))}
        </span>
        <span className="text-[var(--muted)]"> to 2nd apron · </span>
        <ApronBadge status={status} />
      </p>

      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Active + dead" value={formatMoney(spending, true)} accent={team.primary} />
        <StatCard label="Active only" value={formatMoney(payroll?.activeCap ?? spending, true)} />
        <StatCard label="Dead cap" value={formatMoney(payroll?.deadCap ?? 0, true)} />
        <StatCard label="vs Cap" value={formatDelta(roomToLine(spending, cap.salaryCap))} />
        <StatCard label="vs Tax" value={formatDelta(roomToLine(spending, cap.luxuryTax))} />
        <StatCard label="vs 2nd apron" value={formatDelta(roomToLine(spending, cap.secondApron))} />
      </div>

      <div className="mb-5">
        <CapScale cap={cap} payroll={spending} />
      </div>

      {/* Multi-year projection */}
      <section className="mb-5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
        <h2 className="mb-0.5 text-[13px] font-semibold">Multi-year payroll projection</h2>
        <p className="mb-2.5 text-[11px] text-[var(--muted)]">
          Listed dollar amounts by season (options with $ included; FA holds excluded).
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {projections.map((p) => (
            <div
              key={p.season}
              className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-2)] px-2.5 py-2"
            >
              <div className="label-caps">{p.season}</div>
              <div className="mt-0.5 text-[15px] font-semibold tabular-nums">
                {formatMoney(p.total, true)}
              </div>
              <div className="text-[11px] text-[var(--muted)]">
                {p.players} players
                {p.withOptions > 0 ? ` · ${p.withOptions} opt` : ""}
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)]/70"
                  style={{
                    width: `${Math.min(100, (p.total / cap.secondApron) * 100)}%`,
                  }}
                />
              </div>
              <div className="mt-1 text-[10px] text-[var(--muted)] tabular-nums">
                {formatPct((p.total / cap.salaryCap) * 100, 0)} of cap
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold">Current roster</h2>
          <DataTable
            rows={contracts}
            columns={rosterColumns}
            rowKey={(r) => r.id}
            defaultSortKey="salary"
            defaultSortDir="desc"
            compact
            emptyMessage="No roster data"
          />
        </section>

        <div className="space-y-5">
          {/* Draft capital matrix */}
          <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <h2 className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
              Draft capital
            </h2>
            {matrix.years.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted)]">No future picks listed</p>
            ) : (
              <div className="overflow-auto">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wider text-[var(--muted)]">
                      <th className="px-2 py-1.5 text-left">Round</th>
                      {matrix.years.map((y) => (
                        <th key={y} className="px-2 py-1.5 text-center tabular-nums">
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {([1, 2] as const).map((round) => (
                      <tr key={round} className="border-b border-[var(--border)]/60">
                        <td className="px-2 py-2 font-semibold">{round === 1 ? "1st" : "2nd"}</td>
                        {matrix.years.map((y) => {
                          const cell = matrix.cells.get(`${y}-${round}`) ?? [];
                          return (
                            <td key={y} className="px-1 py-2 text-center align-top">
                              {cell.length === 0 ? (
                                <span className="text-[var(--muted)]">·</span>
                              ) : (
                                <div className="flex flex-col gap-0.5 items-center">
                                  {cell.map((p) => (
                                    <span
                                      key={p.id}
                                      title={p.description}
                                      className={`inline-flex rounded-[var(--radius-sm)] px-1.5 py-0.5 text-[10px] font-semibold tabular-nums border ${
                                        p.isSwap || p.isConditional || p.protections
                                          ? "badge-warn"
                                          : p.originalTeam === team.abbr
                                            ? "bg-[var(--surface-2)] text-[var(--foreground)] border-[var(--border)]"
                                            : "badge-accent"
                                      }`}
                                    >
                                      {p.originalTeam}
                                      {p.isSwap ? "⇄" : ""}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <ul className="mt-3 max-h-[160px] space-y-1.5 overflow-auto">
              {picks.map((p) => (
                <li key={p.id} className="text-[11px] text-[var(--muted)] leading-snug">
                  <span className="font-medium text-[var(--foreground)]">
                    {p.year} {p.round === 1 ? "1st" : "2nd"}
                  </span>{" "}
                  via {p.originalTeam}
                  {p.protections ? ` · ${p.protections}` : ""}
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] p-3.5">
            <div className="mb-2.5 flex items-center justify-between gap-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                Free agents by class
              </h2>
              <Link
                href="/free-agents"
                className="text-[11px] font-medium text-[var(--muted)] hover:text-[var(--accent)]"
              >
                All classes →
              </Link>
            </div>
            <ul className="space-y-2 max-h-[280px] overflow-auto">
              {fa.map((c) => {
                const y = effectiveFreeAgencyYear(c);
                const t = effectiveFreeAgencyType(c);
                return (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2 text-sm"
                  >
                    <div className="min-w-0">
                      <PlayerNameButton
                        player={c}
                        onOpen={setSelected}
                        subtitle={
                          <>
                            {c.position}
                            {c.age != null ? ` · ${c.age}` : ""}
                            {y ? ` · age@FA ${ageAtFa(c, currentSeason, y) ?? "—"}` : ""}
                          </>
                        }
                      />
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-xs font-semibold tabular-nums">{y}</div>
                      <div className="mt-0.5 flex justify-end gap-1">
                        {t && <OptionBadge option={t === "UFA" ? "ufa" : "rfa"} />}
                        <span className="text-[11px] text-[var(--muted)] tabular-nums">
                          {formatMoney(faCapHold(c).amount ?? c.currentSalary, true)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
              {!fa.length && (
                <li className="text-sm text-[var(--muted)] py-8 text-center">
                  No free agents flagged
                </li>
              )}
            </ul>
          </section>
        </div>
      </div>

      <PlayerDrawer
        player={selected}
        season={currentSeason}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}


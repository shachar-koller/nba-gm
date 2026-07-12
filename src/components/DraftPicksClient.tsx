"use client";

import { Suspense, useMemo } from "react";
import type { DraftPick, TeamAbbr } from "@/lib/types";
import { TEAMS } from "@/lib/teams";
import { draftCapitalMatrix } from "@/lib/data";
import { useUrlFilters } from "@/lib/urlState";
import { useTableDensity } from "@/lib/tablePrefs";
import { DataTable, type Column, type SortDir } from "./DataTable";
import { Field, FilterBar, PageHeader, SearchInput, SelectInput, StatCard } from "./Filters";
import { TeamChip } from "./TeamLogo";
import { ConditionalBadge, ProtectionBadge, SwapBadge } from "./Badge";
import { ExportButton } from "./ExportButton";
import { DensityToggle } from "./DensityToggle";
import { SavedViewsBar } from "./SavedViews";

function DraftInner({ picks }: { picks: DraftPick[] }) {
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
      year: "",
      owner: "",
      original: "",
      round: "",
      sort: "year",
      dir: "asc",
    },
    {
      q: "Search",
      year: "Year",
      owner: "Owner",
      original: "Original",
      round: "Round",
      sort: "Sort",
      dir: "Dir",
    }
  );
  const { q, year, owner, original, round, sort, dir } = values;
  const { density, compact, setDensity } = useTableDensity();
  const filterChips = chips.filter((c) => c.key !== "sort" && c.key !== "dir");

  const years = useMemo(
    () =>
      [...new Set(picks.map((p) => p.year))]
        .sort((a, b) => a - b)
        .map((y) => ({ value: String(y), label: String(y) })),
    [picks]
  );

  const teamOpts = TEAMS.map((t) => ({
    value: t.abbr,
    label: `${t.abbr} — ${t.name}`,
  }));

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return picks.filter((p) => {
      if (year && String(p.year) !== year) return false;
      if (owner && p.currentOwner !== owner) return false;
      if (original && p.originalTeam !== original) return false;
      if (round && String(p.round) !== round) return false;
      if (query) {
        const hay =
          `${p.description} ${p.currentOwner} ${p.originalTeam} ${p.via ?? ""} ${p.protections ?? ""}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [picks, year, owner, original, round, q]);

  const matrix = useMemo(() => draftCapitalMatrix(filtered), [filtered]);

  const columns: Column<DraftPick>[] = [
    {
      key: "year",
      header: "Year",
      sortable: true,
      sortValue: (r) => r.year,
      className: "font-semibold tabular-nums",
      render: (r) => r.year,
    },
    {
      key: "round",
      header: "Round",
      sortable: true,
      sortValue: (r) => r.round,
      render: (r) => (
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-md bg-[var(--surface-2)] px-1.5 text-xs font-bold">
          {r.round === 1 ? "1st" : "2nd"}
        </span>
      ),
    },
    {
      key: "original",
      header: "Original",
      sortable: true,
      sortValue: (r) => r.originalTeam,
      render: (r) => <TeamChip abbr={r.originalTeam as TeamAbbr} />,
    },
    {
      key: "owner",
      header: "Current Owner",
      sticky: true,
      sortable: true,
      sortValue: (r) => r.currentOwner,
      render: (r) => <TeamChip abbr={r.currentOwner as TeamAbbr} showName />,
    },
    {
      key: "flags",
      header: "Flags",
      render: (r) => (
        <span className="flex flex-wrap gap-1">
          {r.isSwap && <SwapBadge />}
          {(r.protections || r.isConditional) && !r.isSwap && <ConditionalBadge />}
          {r.protections && <ProtectionBadge text={r.protections} />}
        </span>
      ),
    },
    {
      key: "details",
      header: "Protections / Conditions",
      className: "min-w-[220px] max-w-md text-[var(--muted)] text-xs leading-snug",
      render: (r) => r.description,
    },
  ];

  const first = filtered.filter((p) => p.round === 1).length;
  const second = filtered.filter((p) => p.round === 2).length;
  const swaps = filtered.filter((p) => p.isSwap).length;

  // Owner-centric capital scoreboard (top by 1sts owned in filter)
  const ownerScoreboard = useMemo(() => {
    const map = new Map<string, { first: number; second: number }>();
    for (const p of filtered) {
      const cur = map.get(p.currentOwner) ?? { first: 0, second: 0 };
      if (p.round === 1) cur.first += 1;
      else cur.second += 1;
      map.set(p.currentOwner, cur);
    }
    return [...map.entries()]
      .map(([abbr, v]) => ({ abbr, ...v, total: v.first + v.second }))
      .sort((a, b) => b.first - a.first || b.second - a.second)
      .slice(0, 8);
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Draft Picks"
        description="First- and second-round draft rights — who owns each pick, with swaps, protections, and conditions."
      >
        <DensityToggle density={density} onChange={setDensity} />
        <SavedViewsBar path={pathname} queryString={queryString} />
        <ExportButton
          filename="nba-draft-picks.csv"
          headers={[
            "year",
            "round",
            "original",
            "owner",
            "swap",
            "conditional",
            "protections",
            "description",
          ]}
          rows={filtered.map((p) => [
            p.year,
            p.round,
            p.originalTeam,
            p.currentOwner,
            p.isSwap ? "Y" : "N",
            p.isConditional ? "Y" : "N",
            p.protections,
            p.description,
          ])}
        />
      </PageHeader>

      <div className="mb-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="Picks shown" value={filtered.length} hint={`${picks.length} total`} />
        <StatCard label="First round" value={first} />
        <StatCard label="Second round" value={second} />
        <StatCard label="Swaps" value={swaps} />
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
              placeholder="Search descriptions, teams, via…"
            />
          </Field>
          <Field label="Year">
            <SelectInput
              value={year}
              onChange={(v) => setFilter("year", v)}
              options={years}
              placeholder="All years"
            />
          </Field>
          <Field label="Current owner">
            <SelectInput
              value={owner}
              onChange={(v) => setFilter("owner", v)}
              options={teamOpts}
              placeholder="All owners"
            />
          </Field>
          <Field label="Original team">
            <SelectInput
              value={original}
              onChange={(v) => setFilter("original", v)}
              options={teamOpts}
              placeholder="All originals"
            />
          </Field>
          <Field label="Round">
            <SelectInput
              value={round}
              onChange={(v) => setFilter("round", v)}
              options={[
                { value: "1", label: "1st round" },
                { value: "2", label: "2nd round" },
              ]}
              placeholder="All rounds"
            />
          </Field>
        </FilterBar>
      </div>

      <DataTable
        rows={filtered}
        columns={columns}
        rowKey={(r) => r.id}
        sortKey={sort || "year"}
        sortDir={(dir === "asc" || dir === "desc" ? dir : "asc") as SortDir}
        onSortChange={(key, nextDir) => setFilters({ sort: key, dir: nextDir })}
        compact={compact}
        totalCount={picks.length}
        emptyMessage="No draft picks match these filters."
        emptyActionLabel="Clear all filters"
        onEmptyAction={clearFilters}
      />

      {/* Secondary: summary only — below the pick list */}
      <details className="mt-5 rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface)] print:hidden">
        <summary className="cursor-pointer select-none px-3.5 py-2.5 text-[13px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)]">
          Summary · counts by year & top owners
        </summary>
        <div className="grid gap-4 border-t border-[var(--border)] p-3 lg:grid-cols-3">
          <section className="lg:col-span-2 overflow-auto">
            <h3 className="mb-2 label-caps">Picks per year (filtered)</h3>
            {matrix.years.length === 0 ? (
              <p className="py-4 text-center text-[13px] text-[var(--muted)]">
                No picks match filters
              </p>
            ) : (
              <table className="min-w-full text-[12px]">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[10px] uppercase tracking-wide text-[var(--muted)]">
                    <th className="px-2 py-1.5 text-left">Rd</th>
                    {matrix.years.map((y) => (
                      <th key={y} className="px-1.5 py-1.5 text-center tabular-nums">
                        {y}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {([1, 2] as const).map((r) => (
                    <tr key={r} className="border-b border-[var(--border)]">
                      <td className="px-2 py-1.5 font-semibold">{r === 1 ? "1st" : "2nd"}</td>
                      {matrix.years.map((y) => {
                        const cell = matrix.cells.get(`${y}-${r}`) ?? [];
                        return (
                          <td key={y} className="px-1 py-1.5 text-center align-top">
                            {cell.length === 0 ? (
                              <span className="text-[var(--faint)]">·</span>
                            ) : (
                              <span
                                className="inline-flex min-w-[1.5rem] items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-2)] px-1.5 py-0.5 font-semibold tabular-nums"
                                title={cell
                                  .map((p) => `${p.currentOwner} ← ${p.originalTeam}`)
                                  .join("\n")}
                              >
                                {cell.length}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section>
            <h3 className="mb-2 label-caps">Top owners (filtered)</h3>
            <ul className="space-y-1.5">
              {ownerScoreboard.map((o, i) => (
                <li
                  key={o.abbr}
                  className="flex items-center justify-between gap-2 text-[13px]"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    <span className="w-4 text-[11px] text-[var(--faint)] tabular-nums">
                      {i + 1}
                    </span>
                    <TeamChip abbr={o.abbr as TeamAbbr} />
                  </span>
                  <span className="text-[11px] text-[var(--muted)] tabular-nums shrink-0">
                    <span className="font-semibold text-[var(--foreground)]">{o.first}</span>{" "}
                    1st · {o.second} 2nd
                  </span>
                </li>
              ))}
              {!ownerScoreboard.length && (
                <li className="text-[13px] text-[var(--muted)] py-4 text-center">No data</li>
              )}
            </ul>
          </section>
        </div>
      </details>
    </div>
  );
}

export function DraftPicksClient({ picks }: { picks: DraftPick[] }) {
  return (
    <Suspense fallback={<div className="text-sm text-[var(--muted)]">Loading draft picks…</div>}>
      <DraftInner picks={picks} />
    </Suspense>
  );
}

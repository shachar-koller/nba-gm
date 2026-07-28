"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { DataTable, type Column } from "./DataTable";
import { ExportButton } from "./ExportButton";
import {
  Field,
  FilterBar,
  PageHeader,
  SearchInput,
  SelectInput,
  StatCard,
} from "./Filters";
import { TeamLogo } from "./TeamLogo";
import { LEAGUE_STAFF, LEAGUE_STAFF_UPDATED_AT } from "@/lib/staff";
import { TEAM_BY_ABBR } from "@/lib/teams";
import { useUrlFilters } from "@/lib/urlState";
import { matchesSearch } from "@/lib/ux";

type StaffRow = (typeof LEAGUE_STAFF)[number] & {
  teamInfo: (typeof TEAM_BY_ABBR)[keyof typeof TEAM_BY_ABBR];
};

const DIVISIONS = [
  "Atlantic",
  "Central",
  "Southeast",
  "Northwest",
  "Pacific",
  "Southwest",
] as const;

function StaffClientInner() {
  const {
    values,
    setFilter,
    clearFilters,
    clearFilter,
    hasActive,
    chips,
  } = useUrlFilters(
    { q: "", conf: "", div: "" },
    { q: "Search", conf: "Conference", div: "Division" }
  );

  const rows = useMemo(() => {
    return LEAGUE_STAFF.map((staff) => ({
      ...staff,
      teamInfo: TEAM_BY_ABBR[staff.team],
    }))
      .filter((row) => {
        if (values.conf && row.teamInfo.conference !== values.conf) return false;
        if (values.div && row.teamInfo.division !== values.div) return false;
        if (!values.q.trim()) return true;
        return matchesSearch(
          values.q,
          row.teamInfo.fullName,
          row.teamInfo.abbr,
          row.executive,
          row.headCoach,
          row.teamInfo.division,
          row.teamInfo.conference
        );
      })
      .sort((a, b) => a.teamInfo.fullName.localeCompare(b.teamInfo.fullName));
  }, [values.conf, values.div, values.q]);

  const columns: Column<StaffRow>[] = [
    {
      key: "team",
      header: "Team",
      sortable: true,
      sticky: true,
      sortValue: (row) => row.teamInfo.fullName,
      render: (row) => (
        <Link
          href={`/teams/${row.team.toLowerCase()}`}
          className="flex min-w-[190px] items-center gap-2.5 font-medium hover:text-[var(--accent)]"
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
            style={{ backgroundColor: `${row.teamInfo.primary}14` }}
          >
            <TeamLogo abbr={row.team} size={22} />
          </span>
          <span>
            <span className="block">{row.teamInfo.fullName}</span>
            <span className="block text-[10px] font-normal text-[var(--faint)]">
              {row.team}
            </span>
          </span>
        </Link>
      ),
    },
    {
      key: "executive",
      header: "GM / Lead Executive",
      sortable: true,
      sortValue: (row) => row.executive,
      className: "min-w-[180px] font-medium",
      render: (row) => row.executive,
    },
    {
      key: "coach",
      header: "Head Coach",
      sortable: true,
      sortValue: (row) => row.headCoach,
      className: "min-w-[170px] font-medium",
      render: (row) => row.headCoach,
    },
    {
      key: "conference",
      header: "Conference",
      sortable: true,
      sortValue: (row) => row.teamInfo.conference,
      className: "text-[var(--muted)]",
      render: (row) => row.teamInfo.conference,
    },
    {
      key: "division",
      header: "Division",
      sortable: true,
      sortValue: (row) => row.teamInfo.division,
      className: "text-[var(--muted)]",
      render: (row) => row.teamInfo.division,
    },
  ];

  const exportRows = rows.map((row) => [
    row.team,
    row.teamInfo.fullName,
    row.executive,
    row.headCoach,
    row.teamInfo.conference,
    row.teamInfo.division,
  ]);

  return (
    <div>
      <PageHeader
        title="GMs & Head Coaches"
        description="The lead basketball decision-maker and head coach for every NBA team. Front-office titles vary, so the executive column uses each team’s GM-equivalent personnel leader."
      >
        <ExportButton
          filename="nba-gms-head-coaches.csv"
          headers={[
            "team_abbr",
            "team",
            "gm_or_lead_executive",
            "head_coach",
            "conference",
            "division",
          ]}
          rows={exportRows}
        />
      </PageHeader>

      <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <StatCard label="Teams" value={LEAGUE_STAFF.length} />
        <StatCard label="Executives" value={LEAGUE_STAFF.length} />
        <StatCard label="Head coaches" value={LEAGUE_STAFF.length} />
        <StatCard
          label="Directory updated"
          value="Jul 28"
          hint={LEAGUE_STAFF_UPDATED_AT.slice(0, 4)}
        />
      </div>

      <div className="mb-4 print:hidden">
        <FilterBar
          hasActive={hasActive}
          onClear={clearFilters}
          chips={chips}
          onClearChip={clearFilter}
        >
          <Field label="Search" className="min-w-[220px] flex-[2]">
            <SearchInput
              value={values.q}
              onChange={(value) => setFilter("q", value)}
              placeholder="Team, executive, or coach…"
            />
          </Field>
          <Field label="Conference">
            <SelectInput
              value={values.conf}
              onChange={(value) => setFilter("conf", value)}
              options={[
                { value: "East", label: "East" },
                { value: "West", label: "West" },
              ]}
              placeholder="All conferences"
            />
          </Field>
          <Field label="Division">
            <SelectInput
              value={values.div}
              onChange={(value) => setFilter("div", value)}
              options={DIVISIONS.map((division) => ({
                value: division,
                label: division,
              }))}
              placeholder="All divisions"
            />
          </Field>
        </FilterBar>
      </div>

      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(row) => row.team}
        defaultSortKey="team"
        defaultSortDir="asc"
        totalCount={LEAGUE_STAFF.length}
        emptyMessage="No teams, executives, or coaches match these filters."
        emptyActionLabel="Clear all filters"
        onEmptyAction={clearFilters}
      />

      <p className="mt-3 text-[11px] leading-relaxed text-[var(--faint)]">
        “GM / lead executive” identifies the top basketball personnel
        decision-maker; official titles may be President of Basketball
        Operations, Executive Vice President, or General Manager.
      </p>
    </div>
  );
}

export function StaffClient() {
  return (
    <Suspense>
      <StaffClientInner />
    </Suspense>
  );
}

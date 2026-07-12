import { CAP_THRESHOLDS, CURRENT_SEASON, effectivePayroll } from "./cap";
import type {
  AppData,
  CapThresholds,
  DraftPick,
  PlayerContract,
  TeamAbbr,
  TeamPayroll,
} from "./types";
import { TEAMS } from "./teams";
import { seasonSortKey } from "./freeAgency";

// Bundled snapshot — refreshed via `npm run refresh`
import snapshot from "@/data/app-data.json";

export function getAppData(): AppData {
  const data = snapshot as AppData;
  return {
    ...data,
    capThresholds: data.capThresholds?.length ? data.capThresholds : CAP_THRESHOLDS,
    currentSeason: data.currentSeason || CURRENT_SEASON,
  };
}

export function getContracts(data: AppData = getAppData()): PlayerContract[] {
  return data.contracts ?? [];
}

export function getDraftPicks(data: AppData = getAppData()): DraftPick[] {
  return data.draftPicks ?? [];
}

export function getTeamPayrolls(data: AppData = getAppData()): TeamPayroll[] {
  return data.teamPayrolls ?? [];
}

export function getTeamPayroll(
  abbr: TeamAbbr,
  data: AppData = getAppData()
): TeamPayroll | undefined {
  return data.teamPayrolls.find((p) => p.team === abbr);
}

export function getTeamContracts(
  abbr: TeamAbbr,
  data: AppData = getAppData()
): PlayerContract[] {
  return data.contracts
    .filter((c) => c.team === abbr)
    .sort((a, b) => (b.currentSalary ?? 0) - (a.currentSalary ?? 0));
}

export function getTeamDraftPicks(
  abbr: TeamAbbr,
  data: AppData = getAppData()
): DraftPick[] {
  return data.draftPicks
    .filter((p) => p.currentOwner === abbr)
    .sort((a, b) => a.year - b.year || a.round - b.round);
}

export function getUpcomingFreeAgents(
  abbr: TeamAbbr,
  data: AppData = getAppData()
): PlayerContract[] {
  const season = data.currentSeason;
  return getTeamContracts(abbr, data).filter((c) => {
    if (c.freeAgencyYear === season) return true;
    return c.salaries.some(
      (s) =>
        s.season === season &&
        (s.option === "player" ||
          s.option === "team" ||
          s.option === "ufa" ||
          s.option === "rfa")
    );
  });
}

/** Sum guaranteed/listed dollar amounts for a team in a season (no FA hold rows). */
export function computeTeamPayrollFromContracts(
  abbr: TeamAbbr,
  season: string,
  data: AppData = getAppData()
): number {
  return getTeamContracts(abbr, data).reduce((sum, c) => {
    const y = c.salaries.find((s) => s.season === season && s.amount != null);
    return sum + (y?.amount ?? 0);
  }, 0);
}

/** Prefer scraped active+dead; fall back to summing contracts. */
export function teamSpendingPayroll(
  abbr: TeamAbbr,
  data: AppData = getAppData()
): number {
  const p = getTeamPayroll(abbr, data);
  if (p && (p.activeCap > 0 || p.deadCap > 0)) {
    return effectivePayroll(p);
  }
  return computeTeamPayrollFromContracts(abbr, data.currentSeason, data);
}

export interface SeasonProjection {
  season: string;
  total: number;
  players: number;
  withOptions: number;
}

/** Multi-year guaranteed/listed payroll for a team (options still counted if $ present). */
export function projectTeamPayroll(
  abbr: TeamAbbr,
  data: AppData = getAppData(),
  seasonsAhead = 5
): SeasonProjection[] {
  const contracts = getTeamContracts(abbr, data);
  const start = seasonSortKey(data.currentSeason);
  const seasons: string[] = [];
  for (let i = 0; i < seasonsAhead; i++) {
    const y = start + i;
    seasons.push(`${y}-${String(y + 1).slice(-2)}`);
  }

  return seasons.map((season) => {
    let total = 0;
    let players = 0;
    let withOptions = 0;
    for (const c of contracts) {
      const y = c.salaries.find((s) => s.season === season);
      if (!y) continue;
      if (y.amount != null) {
        total += y.amount;
        players += 1;
        if (y.option === "player" || y.option === "team" || y.option === "non-guaranteed") {
          withOptions += 1;
        }
      } else if (
        y.option === "player" ||
        y.option === "team" ||
        y.option === "non-guaranteed"
      ) {
        withOptions += 1;
      }
    }
    return { season, total, players, withOptions };
  });
}

export function getExpiringContracts(
  data: AppData = getAppData(),
  faYear?: string | null
): PlayerContract[] {
  const year =
    faYear ??
    (() => {
      // Next FA class after current season (e.g. 2026-27 season → 2027-28 FA)
      const start = seasonSortKey(data.currentSeason) + 1;
      return `${start}-${String(start + 1).slice(-2)}`;
    })();

  return getContracts(data)
    .filter((c) => c.freeAgencyYear === year)
    .sort((a, b) => (b.currentSalary ?? 0) - (a.currentSalary ?? 0));
}

export function uniquePositions(
  contracts: PlayerContract[] = getContracts()
): string[] {
  const set = new Set<string>();
  for (const c of contracts) {
    if (c.position) set.add(c.position);
  }
  const order = ["PG", "SG", "SF", "PF", "C", "G", "F"];
  return [...set].sort((a, b) => {
    const ia = order.indexOf(a);
    const ib = order.indexOf(b);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
}

export function salaryForSeason(
  c: PlayerContract,
  season: string
): number | null {
  const y = c.salaries.find((s) => s.season === season);
  if (y?.amount != null) return y.amount;
  if (season === getAppData().currentSeason) return c.currentSalary;
  return null;
}

export function pctOfCapForSeason(
  c: PlayerContract,
  season: string,
  cap?: CapThresholds
): number | null {
  const y = c.salaries.find((s) => s.season === season);
  if (y?.pctOfCap != null) return y.pctOfCap;
  const amount = y?.amount ?? null;
  const line = cap?.salaryCap;
  if (amount == null || !line) return null;
  return (amount / line) * 100;
}

export interface DraftCapitalCell {
  year: number;
  round: 1 | 2;
  picks: DraftPick[];
}

export function draftCapitalMatrix(
  picks: DraftPick[],
  owner?: TeamAbbr
): { years: number[]; cells: Map<string, DraftPick[]> } {
  const filtered = owner ? picks.filter((p) => p.currentOwner === owner) : picks;
  const years = [...new Set(filtered.map((p) => p.year))].sort((a, b) => a - b);
  const cells = new Map<string, DraftPick[]>();
  for (const p of filtered) {
    const key = `${p.year}-${p.round}`;
    const list = cells.get(key) ?? [];
    list.push(p);
    cells.set(key, list);
  }
  return { years, cells };
}

export function dataAgeDays(data: AppData = getAppData()): number | null {
  const t = new Date(data.updatedAt).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (1000 * 60 * 60 * 24));
}

export function dataFreshness(data: AppData = getAppData()): {
  updatedAt: string;
  source: string;
  label: string;
} {
  const d = new Date(data.updatedAt);
  const label = Number.isNaN(d.getTime())
    ? "Unknown"
    : d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
  return { updatedAt: data.updatedAt, source: data.source, label };
}

export function allTeamAbbrs(): TeamAbbr[] {
  return TEAMS.map((t) => t.abbr);
}

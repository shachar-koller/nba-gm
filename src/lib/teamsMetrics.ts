import type { DraftPick, PlayerContract } from "./types";

/** Count owned picks, optionally filtered by round. */
export function countOwnedPicks(
  picks: DraftPick[],
  round?: 1 | 2
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of picks) {
    if (round != null && p.round !== round) continue;
    out[p.currentOwner] = (out[p.currentOwner] ?? 0) + 1;
  }
  return out;
}

/**
 * Salary-weighted average age: Σ(age × current salary) / Σ(salary).
 * Players missing age or non-positive salary are skipped.
 */
export function salaryWeightedAge(
  contracts: PlayerContract[]
): number | null {
  let weightSum = 0;
  let weight = 0;
  for (const c of contracts) {
    if (c.age == null || !Number.isFinite(c.age)) continue;
    const sal = c.currentSalary;
    if (sal == null || !Number.isFinite(sal) || sal <= 0) continue;
    weightSum += c.age * sal;
    weight += sal;
  }
  if (weight <= 0) return null;
  return weightSum / weight;
}

/** Per-team weighted ages from a full contract list. */
export function weightedAgeByTeam(
  contracts: PlayerContract[]
): Record<string, number | null> {
  const byTeam = new Map<string, PlayerContract[]>();
  for (const c of contracts) {
    const list = byTeam.get(c.team) ?? [];
    list.push(c);
    byTeam.set(c.team, list);
  }
  const out: Record<string, number | null> = {};
  for (const [team, list] of byTeam) {
    out[team] = salaryWeightedAge(list);
  }
  return out;
}

export type TeamSortKey =
  | "payroll"
  | "space"
  | "picks"
  | "first"
  | "age"
  | "wage"
  | "name";

export type SortDir = "asc" | "desc";

export interface TeamSortRow {
  name: string;
  spending: number;
  roomCap: number;
  picks: number;
  firstRound: number;
  avgAge: number | null;
  weightedAge: number | null;
}

/** Default direction for a sort key (high→low for metrics, A→Z for name). */
export function defaultDirForTeamSort(sort: string): SortDir {
  return sort === "name" ? "asc" : "desc";
}

/**
 * Compare two team rows for the Teams dashboard.
 * Returns negative if a should come before b.
 */
export function compareTeamRows(
  a: TeamSortRow,
  b: TeamSortRow,
  sort: string,
  dir: SortDir
): number {
  const mul = dir === "asc" ? 1 : -1;
  let cmp = 0;
  switch (sort) {
    case "name":
      cmp = a.name.localeCompare(b.name);
      // name uses dir directly: asc = A→Z, desc = Z→A
      return dir === "asc" ? cmp : -cmp;
    case "space":
      cmp = a.roomCap - b.roomCap;
      break;
    case "picks":
      cmp = a.picks - b.picks;
      break;
    case "first":
      cmp = a.firstRound - b.firstRound;
      break;
    case "age":
      cmp = (a.avgAge ?? -1) - (b.avgAge ?? -1);
      break;
    case "wage":
      cmp = (a.weightedAge ?? -1) - (b.weightedAge ?? -1);
      break;
    case "payroll":
    default:
      cmp = a.spending - b.spending;
      break;
  }
  // For numeric keys, cmp is low−high; mul flips for desc (high first)
  if (cmp !== 0) return mul * cmp;
  // Stable tie-break by name ascending
  return a.name.localeCompare(b.name);
}

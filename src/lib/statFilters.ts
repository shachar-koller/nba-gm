import type { PlayerSeasonStats } from "./types";

/** URL-backed minimum threshold for a numeric player-season field. */
export type StatMinFilterDef = {
  /** Query-param key (e.g. minPts). */
  key: string;
  /** Field on PlayerSeasonStats to compare. */
  playerKey: keyof PlayerSeasonStats;
  /** Short label above the input. */
  label: string;
  /** Label used in active filter chips. */
  chipLabel: string;
  placeholder?: string;
};

/** Minimum thresholds for basic counting / shooting stats + minutes. */
export const BASIC_STAT_MIN_FILTERS: StatMinFilterDef[] = [
  { key: "minMin", playerKey: "min", label: "Min MIN", chipLabel: "MIN", placeholder: "e.g. 20" },
  { key: "minPts", playerKey: "pts", label: "Min PPG", chipLabel: "PPG", placeholder: "e.g. 15" },
  { key: "minReb", playerKey: "reb", label: "Min RPG", chipLabel: "RPG", placeholder: "e.g. 5" },
  { key: "minAst", playerKey: "ast", label: "Min APG", chipLabel: "APG", placeholder: "e.g. 4" },
  { key: "minStl", playerKey: "stl", label: "Min STL", chipLabel: "STL", placeholder: "e.g. 1" },
  { key: "minBlk", playerKey: "blk", label: "Min BLK", chipLabel: "BLK", placeholder: "e.g. 0.5" },
  { key: "minFgPct", playerKey: "fgPct", label: "Min FG%", chipLabel: "FG%", placeholder: "e.g. 45" },
  { key: "minThreePct", playerKey: "threePct", label: "Min 3P%", chipLabel: "3P%", placeholder: "e.g. 35" },
  { key: "minTsPct", playerKey: "tsPct", label: "Min TS%", chipLabel: "TS%", placeholder: "e.g. 55" },
  { key: "minTov", playerKey: "tov", label: "Min TOV", chipLabel: "TOV", placeholder: "e.g. 1" },
  { key: "minFtPct", playerKey: "ftPct", label: "Min FT%", chipLabel: "FT%", placeholder: "e.g. 80" },
  { key: "minFgm", playerKey: "fgm", label: "Min FGM", chipLabel: "FGM", placeholder: "e.g. 5" },
  { key: "minFga", playerKey: "fga", label: "Min FGA", chipLabel: "FGA", placeholder: "e.g. 10" },
  { key: "minThreePm", playerKey: "threePm", label: "Min 3PM", chipLabel: "3PM", placeholder: "e.g. 2" },
  { key: "minFtm", playerKey: "ftm", label: "Min FTM", chipLabel: "FTM", placeholder: "e.g. 2" },
  { key: "minPf", playerKey: "pf", label: "Min PF", chipLabel: "PF", placeholder: "e.g. 2" },
  { key: "minDd2", playerKey: "dd2", label: "Min DD2", chipLabel: "DD2", placeholder: "e.g. 10" },
  { key: "minTd3", playerKey: "td3", label: "Min TD3", chipLabel: "TD3", placeholder: "e.g. 1" },
];

/** Minimum thresholds for advanced / rate metrics + minutes. */
export const ADVANCED_STAT_MIN_FILTERS: StatMinFilterDef[] = [
  { key: "minMin", playerKey: "min", label: "Min MIN", chipLabel: "MIN", placeholder: "e.g. 20" },
  { key: "minPts", playerKey: "pts", label: "Min PTS", chipLabel: "PTS", placeholder: "e.g. 15" },
  { key: "minTsPct", playerKey: "tsPct", label: "Min TS%", chipLabel: "TS%", placeholder: "e.g. 55" },
  { key: "minEfgPct", playerKey: "efgPct", label: "Min eFG%", chipLabel: "eFG%", placeholder: "e.g. 52" },
  { key: "minThreePar", playerKey: "threePar", label: "Min 3PAr", chipLabel: "3PAr", placeholder: "e.g. 0.3" },
  { key: "minFtr", playerKey: "ftr", label: "Min FTr", chipLabel: "FTr", placeholder: "e.g. 0.2" },
  { key: "minTovPct", playerKey: "tovPct", label: "Min TOV%", chipLabel: "TOV%", placeholder: "e.g. 10" },
  { key: "minAstTo", playerKey: "astTo", label: "Min AST/TO", chipLabel: "AST/TO", placeholder: "e.g. 2" },
  { key: "minEff", playerKey: "eff", label: "Min EFF", chipLabel: "EFF", placeholder: "e.g. 15" },
  { key: "minStocks", playerKey: "stocks", label: "Min STL+BLK", chipLabel: "STL+BLK", placeholder: "e.g. 1.5" },
  { key: "minFgPct", playerKey: "fgPct", label: "Min FG%", chipLabel: "FG%", placeholder: "e.g. 45" },
  { key: "minThreePct", playerKey: "threePct", label: "Min 3P%", chipLabel: "3P%", placeholder: "e.g. 35" },
  { key: "minAst", playerKey: "ast", label: "Min AST", chipLabel: "AST", placeholder: "e.g. 4" },
  { key: "minTov", playerKey: "tov", label: "Min TOV", chipLabel: "TOV", placeholder: "e.g. 1" },
];

/** Empty defaults for every min-* filter key (for useUrlFilters). */
export function minFilterDefaults(defs: StatMinFilterDef[]): Record<string, string> {
  return Object.fromEntries(defs.map((d) => [d.key, ""]));
}

/** Labels for min-* filter chips. */
export function minFilterLabels(
  defs: StatMinFilterDef[]
): Record<string, string> {
  return Object.fromEntries(defs.map((d) => [d.key, d.chipLabel]));
}

/**
 * True when value meets a minimum threshold from a text box.
 * Empty / non-numeric inputs do not filter.
 * Missing player values are treated as 0.
 */
export function passesMinThreshold(
  value: number | null | undefined,
  minStr: string
): boolean {
  const trimmed = minStr.trim();
  if (!trimmed) return true;
  const min = Number(trimmed);
  if (!Number.isFinite(min)) return true;
  return (value ?? 0) >= min;
}

/** Apply all configured min filters to a player row. */
export function passesStatMinFilters(
  player: PlayerSeasonStats,
  defs: StatMinFilterDef[],
  values: Record<string, string>
): boolean {
  for (const def of defs) {
    const raw = values[def.key] ?? "";
    if (!raw.trim()) continue;
    const field = player[def.playerKey];
    const num = typeof field === "number" ? field : null;
    if (!passesMinThreshold(num, raw)) return false;
  }
  return true;
}

/** Format active chip display for a min filter (e.g. "≥ 20"). */
export function formatMinFilterChip(value: string): string {
  return `≥ ${value}`;
}

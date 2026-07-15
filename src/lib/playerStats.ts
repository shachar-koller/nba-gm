import type { PlayerSeasonStats, PlayerStatsData } from "./types";
import snapshot from "@/data/player-stats.json";

export function getPlayerStatsData(): PlayerStatsData {
  return snapshot as PlayerStatsData;
}

export function getPlayerStats(
  data: PlayerStatsData = getPlayerStatsData()
): PlayerSeasonStats[] {
  return data.players ?? [];
}

export function uniqueStatPositions(
  players: PlayerSeasonStats[] = getPlayerStats()
): string[] {
  const set = new Set<string>();
  for (const p of players) {
    if (p.position) set.add(p.position);
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

export function formatStat(
  value: number | null | undefined,
  digits = 1
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function formatRate(
  value: number | null | undefined,
  digits = 3
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toFixed(digits);
}

export function formatStatPct(
  value: number | null | undefined,
  digits = 1
): string {
  if (value == null || Number.isNaN(value)) return "—";
  return `${value.toFixed(digits)}%`;
}

export interface AdvancedStatDefinition {
  key: string;
  abbr: string;
  name: string;
  formula?: string;
  /** How to read the number in practice. */
  howToUse: string;
  /** What “good” roughly looks like in the modern NBA. */
  benchmark?: string;
  higherIsBetter: boolean;
}

/** Glossary for the advanced stats page (and tooltips). */
export const ADVANCED_STAT_DEFINITIONS: AdvancedStatDefinition[] = [
  {
    key: "tsPct",
    abbr: "TS%",
    name: "True Shooting Percentage",
    formula: "PTS / (2 × (FGA + 0.44 × FTA))",
    howToUse:
      "Overall scoring efficiency including two-pointers, threes, and free throws. Prefer TS% over raw FG% when comparing scorers who draw fouls or take different shot mixes.",
    benchmark: "League average ~56–58%. Elite scorers often 60%+.",
    higherIsBetter: true,
  },
  {
    key: "efgPct",
    abbr: "eFG%",
    name: "Effective Field Goal Percentage",
    formula: "(FGM + 0.5 × 3PM) / FGA",
    howToUse:
      "Field-goal efficiency that weights threes as 1.5 makes. Use it to evaluate shot selection and shooting without free throws. Pair with FTr when free throws are a big part of a player's game.",
    benchmark: "League average ~53–55%. High-volume shooters above ~55% are efficient.",
    higherIsBetter: true,
  },
  {
    key: "threePar",
    abbr: "3PAr",
    name: "Three-Point Attempt Rate",
    formula: "3PA / FGA",
    howToUse:
      "Share of field-goal attempts that are threes. Describes shot profile, not quality. A high 3PAr means a perimeter-oriented diet; judge quality with 3P% and eFG%/TS%.",
    benchmark: "Guards often 0.35–0.55; bigs who stretch the floor ~0.25+.",
    higherIsBetter: false,
  },
  {
    key: "ftr",
    abbr: "FTr",
    name: "Free Throw Rate",
    formula: "FTA / FGA",
    howToUse:
      "How often a player gets to the line relative to shooting attempts. High FTr boosts TS% and indicates pressure on the rim or drawing fouls — useful when evaluating creators and finishers.",
    benchmark: "Stars who attack often sit ~0.30+; average is lower.",
    higherIsBetter: true,
  },
  {
    key: "tovPct",
    abbr: "TOV%",
    name: "Turnover Percentage",
    formula: "100 × TOV / (FGA + 0.44 × FTA + TOV)",
    howToUse:
      "Estimated turnovers per 100 plays involving the player (not per game). Better than raw TOV for comparing high-usage creators to role players. Lower is better, but high-usage initiators will run higher.",
    benchmark: "Roughly 10–12% is solid; ball-handlers often 12–15%.",
    higherIsBetter: false,
  },
  {
    key: "astTo",
    abbr: "AST/TO",
    name: "Assist-to-Turnover Ratio",
    formula: "AST / TOV",
    howToUse:
      "Quick read on decision-making for passers. Strong for point guards and connectors; less meaningful for low-assist scorers. Combine with usage context and raw assist totals.",
    benchmark: "Primary creators ~2.0+ is strong; elite distributors can clear 3.0.",
    higherIsBetter: true,
  },
  {
    key: "eff",
    abbr: "EFF",
    name: "Efficiency (NBA traditional)",
    formula:
      "(PTS + REB + AST + STL + BLK − missed FG − missed FT − TOV) / GP",
    howToUse:
      "All-in-one counting-stat box-score metric used on NBA.com. Rewards production and penalizes misses/turnovers. Coarse (no opponent or pace adjustment) but useful for sorting overall box-score impact.",
    benchmark: "All-stars often 20+; MVP candidates can clear 30.",
    higherIsBetter: true,
  },
  {
    key: "stocks",
    abbr: "STL+BLK",
    name: "Stocks (steals + blocks)",
    formula: "STL + BLK (per game)",
    howToUse:
      "Simple defensive event rate from the box score. Helpful for identifying disruptors; does not capture contest quality, positioning, or team scheme. Pair with role and minutes.",
    benchmark: "1.5+ is solid two-way contribution; 2.0+ is standout event creation.",
    higherIsBetter: true,
  },
];

export function advancedDefByKey(
  key: string
): AdvancedStatDefinition | undefined {
  return ADVANCED_STAT_DEFINITIONS.find((d) => d.key === key);
}

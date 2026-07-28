/**
 * Position filter helpers.
 *
 * Spotrac-style data mixes specific slots (PG, SG, …) with broad tags (G, F).
 * Selecting a broad tag should include the specific positions under it.
 */

const BROAD_TO_SPECIFIC: Record<string, readonly string[]> = {
  G: ["G", "PG", "SG"],
  F: ["F", "SF", "PF"],
  // Center stays exact; listed for completeness if we ever expand.
  C: ["C"],
};

/** Shared position display order for filters across salaries, FA, and stats. */
export const POSITION_ORDER = ["PG", "SG", "SF", "PF", "C", "G", "F"] as const;

export function sortPositionList(positions: Iterable<string>): string[] {
  const set = positions instanceof Set ? positions : new Set(positions);
  return [...set].sort((a, b) => {
    const ia = POSITION_ORDER.indexOf(a as (typeof POSITION_ORDER)[number]);
    const ib = POSITION_ORDER.indexOf(b as (typeof POSITION_ORDER)[number]);
    if (ia >= 0 && ib >= 0) return ia - ib;
    if (ia >= 0) return -1;
    if (ib >= 0) return 1;
    return a.localeCompare(b);
  });
}

/** Human labels for the filter dropdown. */
export function positionFilterLabel(pos: string): string {
  switch (pos.toUpperCase()) {
    case "G":
      return "G · all guards (PG/SG)";
    case "F":
      return "F · all forwards (SF/PF)";
    case "PG":
      return "PG · point guard";
    case "SG":
      return "SG · shooting guard";
    case "SF":
      return "SF · small forward";
    case "PF":
      return "PF · power forward";
    case "C":
      return "C · center";
    default:
      return pos;
  }
}

/** Split multi-position strings like "PG-SG" or "G/F". */
export function positionTokens(playerPos: string | null | undefined): string[] {
  if (!playerPos) return [];
  return playerPos
    .split(/[-/,]/)
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
}

/**
 * Whether a player's position matches a filter value.
 * - Exact codes (PG, SG, …) match only that slot (or a multi-pos that includes it).
 * - Broad codes G / F expand to PG+SG+G and SF+PF+F respectively.
 */
export function positionMatches(
  filter: string,
  playerPos: string | null | undefined
): boolean {
  const f = filter.trim().toUpperCase();
  if (!f) return true;
  const tokens = positionTokens(playerPos);
  if (tokens.length === 0) return false;

  const expanded = BROAD_TO_SPECIFIC[f];
  if (expanded) {
    const set = new Set(expanded);
    return tokens.some((t) => set.has(t));
  }

  return tokens.some((t) => t === f);
}

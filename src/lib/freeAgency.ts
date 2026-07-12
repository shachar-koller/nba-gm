import type { OptionType, PlayerContract } from "./types";

export const NO_FA_BUCKET = "No FA Scheduled";

/** Season-string sort key: "2027-28" → 2027; unknown last. */
export function seasonSortKey(season: string): number {
  const n = parseInt(season.slice(0, 4), 10);
  return Number.isFinite(n) ? n : 9999;
}

export function effectiveFreeAgencyYear(c: PlayerContract): string | null {
  if (c.freeAgencyYear) return c.freeAgencyYear;
  const faRow = [...c.salaries]
    .reverse()
    .find((s) => s.option === "ufa" || s.option === "rfa");
  return faRow?.season ?? null;
}

export function effectiveFreeAgencyType(
  c: PlayerContract
): "UFA" | "RFA" | null {
  if (c.freeAgencyType === "UFA" || c.freeAgencyType === "RFA") {
    return c.freeAgencyType;
  }
  const faRow = c.salaries.find((s) => s.option === "ufa" || s.option === "rfa");
  if (faRow?.option === "ufa") return "UFA";
  if (faRow?.option === "rfa") return "RFA";
  return null;
}

/** Parse "$31.5M", "$2.6M", "$1,234,567" from display strings. */
export function parseCompactMoney(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.match(/\$[\d,]+(?:\.\d+)?\s*[KMB]?/i);
  if (!m) return null;
  const raw = m[0].replace(/\s/g, "");
  const suffix = raw.slice(-1).toUpperCase();
  let mult = 1;
  let numStr = raw.replace(/[$,]/g, "");
  if (suffix === "B") {
    mult = 1_000_000_000;
    numStr = numStr.slice(0, -1);
  } else if (suffix === "M") {
    mult = 1_000_000;
    numStr = numStr.slice(0, -1);
  } else if (suffix === "K") {
    mult = 1_000;
    numStr = numStr.slice(0, -1);
  }
  const n = Number(numStr);
  return Number.isFinite(n) ? n * mult : null;
}

export interface FaCapHold {
  amount: number | null;
  display: string;
}

export function faCapHold(c: PlayerContract): FaCapHold {
  const faRow = c.salaries.find((s) => s.option === "ufa" || s.option === "rfa");
  if (!faRow) return { amount: null, display: "—" };
  const amount =
    faRow.amount ?? parseCompactMoney(faRow.display) ?? null;
  return {
    amount,
    display: faRow.display || "—",
  };
}

export function lastSalaryBeforeFa(
  c: PlayerContract,
  faYear: string | null
): number | null {
  const rows = c.salaries
    .filter((s) => s.amount != null)
    .filter((s) => !faYear || seasonSortKey(s.season) < seasonSortKey(faYear));
  if (!rows.length) return c.currentSalary;
  rows.sort((a, b) => seasonSortKey(b.season) - seasonSortKey(a.season));
  return rows[0].amount;
}

export function ageAtFa(
  c: PlayerContract,
  currentSeason: string,
  faYear: string | null
): number | null {
  if (c.age == null || !faYear) return c.age;
  const delta = seasonSortKey(faYear) - seasonSortKey(currentSeason);
  if (!Number.isFinite(delta)) return c.age;
  return c.age + delta;
}

/** Player/team/NG options that fire before free agency. */
export function timingOptions(
  c: PlayerContract,
  faYear: string | null
): Array<{ season: string; option: OptionType }> {
  return c.salaries
    .filter((s) =>
      s.option === "player" || s.option === "team" || s.option === "non-guaranteed"
    )
    .filter((s) => !faYear || seasonSortKey(s.season) < seasonSortKey(faYear))
    .map((s) => ({ season: s.season, option: s.option }));
}

export const TWO_WAY_BUCKET = "Two-Way";

export function isTwoWay(c: PlayerContract): boolean {
  return c.salaries.some((s) => s.option === "two-way");
}

export interface FaClassGroup {
  year: string;
  contracts: PlayerContract[];
  ufAs: PlayerContract[];
  rfAs: PlayerContract[];
  unknown: PlayerContract[];
  twoWayCount: number;
  totalCapHold: number;
  headliners: PlayerContract[];
}

function bucketKey(c: PlayerContract): string {
  if (isTwoWay(c) && !effectiveFreeAgencyYear(c)) return TWO_WAY_BUCKET;
  return effectiveFreeAgencyYear(c) ?? NO_FA_BUCKET;
}

export function groupFreeAgents(
  contracts: PlayerContract[],
  currentSeason: string
): FaClassGroup[] {
  void currentSeason;
  const map = new Map<string, PlayerContract[]>();

  for (const c of contracts) {
    const year = bucketKey(c);
    const list = map.get(year) ?? [];
    list.push(c);
    map.set(year, list);
  }

  const rank = (y: string) => {
    if (y === TWO_WAY_BUCKET) return 9000;
    if (y === NO_FA_BUCKET) return 9999;
    return seasonSortKey(y);
  };

  const years = [...map.keys()].sort((a, b) => rank(a) - rank(b));

  return years.map((year) => {
    const list = map.get(year) ?? [];
    const ufAs = list.filter((c) => effectiveFreeAgencyType(c) === "UFA");
    const rfAs = list.filter((c) => effectiveFreeAgencyType(c) === "RFA");
    const unknown = list.filter((c) => !effectiveFreeAgencyType(c));
    const twoWayCount = list.filter(isTwoWay).length;
    const isSpecial = year === NO_FA_BUCKET || year === TWO_WAY_BUCKET;

    const totalCapHold = list.reduce((sum, c) => {
      if (isTwoWay(c)) return sum;
      return sum + (faCapHold(c).amount ?? 0);
    }, 0);

    const headliners = [...list]
      .sort((a, b) => {
        const ah =
          faCapHold(a).amount ??
          lastSalaryBeforeFa(a, isSpecial ? null : year) ??
          0;
        const bh =
          faCapHold(b).amount ??
          lastSalaryBeforeFa(b, isSpecial ? null : year) ??
          0;
        return bh - ah;
      })
      .slice(0, 3);

    return {
      year,
      contracts: list,
      ufAs,
      rfAs,
      unknown,
      twoWayCount,
      totalCapHold,
      headliners,
    };
  });
}

export function freeAgentClassYears(contracts: PlayerContract[]): string[] {
  const set = new Set<string>();
  for (const c of contracts) {
    const y = effectiveFreeAgencyYear(c);
    if (y) set.add(y);
  }
  return [...set].sort((a, b) => seasonSortKey(a) - seasonSortKey(b));
}

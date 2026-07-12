import type { CapThresholds } from "./types";

/**
 * Official NBA salary-cap thresholds.
 * Current season figures from NBA.com (set June/July before free agency).
 * Historical figures from published league announcements / RealGM.
 */
export const CAP_THRESHOLDS: CapThresholds[] = [
  {
    season: "2026-27",
    salaryCap: 164_961_000,
    luxuryTax: 200_428_000,
    firstApron: 209_015_000,
    secondApron: 221_686_000,
    salaryFloor: 148_465_000,
    notes: "Official figures announced by the NBA (July 2026).",
  },
  {
    season: "2025-26",
    salaryCap: 154_647_000,
    luxuryTax: 187_895_000,
    firstApron: 195_945_000,
    secondApron: 207_824_000,
    salaryFloor: 139_182_000,
  },
  {
    season: "2024-25",
    salaryCap: 140_588_000,
    luxuryTax: 170_814_000,
    firstApron: 178_132_000,
    secondApron: 188_931_000,
    salaryFloor: 126_529_000,
  },
  {
    season: "2023-24",
    salaryCap: 136_021_000,
    luxuryTax: 165_294_000,
    firstApron: 172_346_000,
    secondApron: 182_794_000,
    salaryFloor: 122_419_000,
  },
];

export const CURRENT_SEASON = CAP_THRESHOLDS[0].season;

export const CAP_GLOSSARY = {
  salaryCap: {
    title: "Salary Cap",
    short: "Soft spending limit for team payroll.",
    detail:
      "The soft salary cap is the baseline payroll ceiling. Teams may exceed it using Bird rights, mid-level exceptions, and other CBA tools—but once over the cap they cannot sign free agents with pure cap space.",
  },
  salaryFloor: {
    title: "Salary Floor",
    short: "Minimum team payroll (90% of the cap).",
    detail:
      "Teams must spend at least the floor by the end of the season or distribute the shortfall to players. It sits at 90% of the salary cap.",
  },
  luxuryTax: {
    title: "Luxury Tax",
    short: "Penalty line for high-spending teams.",
    detail:
      "Teams above the tax line pay progressive tax dollars to the league (shared with non-tax teams). Repeat offenders face denser tax brackets. Crossing the tax also limits certain exceptions.",
  },
  firstApron: {
    title: "First Apron",
    short: "Harder spending limit with reduced tools.",
    detail:
      "Teams above the first apron cannot use the taxpayer mid-level exception fully in some forms, face tighter trade matching, cannot acquire players via sign-and-trade into certain slots, and cannot take back more salary in trades in some scenarios.",
  },
  secondApron: {
    title: "Second Apron",
    short: "Strictest hard-cap-like regime.",
    detail:
      "Second-apron teams face the harshest restrictions: no aggregation of salaries in trades, no cash in deals, frozen draft picks if repeated (pick-freeze / conveyance rules), no buyout market add-ons in many cases, and no mid-level exception. It is the CBA’s strongest brake on superteams.",
  },
} as const;

export const APRON_RESTRICTIONS = {
  underCap: [
    "Can use cap space to sign free agents",
    "Full access to non-taxpayer mid-level exception (NTMLE)",
    "Can execute sign-and-trades more freely",
  ],
  overCapUnderTax: [
    "Cannot use pure cap space",
    "May still use Bird / Early Bird / Non-Bird rights",
    "Full NTMLE available if not hard-capped by other choices",
  ],
  taxUnderFirstApron: [
    "Taxpayer mid-level exception (TMLE) only if hard-capped at first apron or below second",
    "Progressive luxury-tax payments apply",
    "Trade matching rules tighter than under-cap teams",
  ],
  firstApron: [
    "Cannot use full NTMLE; limited to TMLE / room tools depending on status",
    "Cannot acquire a player via sign-and-trade in many cases",
    "Cannot take back more salary than sent out in trades",
    "Cannot use multiple trade exceptions in the same deal as freely",
  ],
  secondApron: [
    "No salary aggregation in multi-player trades",
    "Cannot send cash in trades",
    "Cannot use trade exceptions created previously in many situations",
    "Cannot sign buyout players above the minimum in many cases",
    "Repeated second-apron status can freeze future first-round picks",
    "Hardest path to improve the roster mid-season",
  ],
} as const;

export function getCurrentCap(thresholds: CapThresholds[] = CAP_THRESHOLDS): CapThresholds {
  return thresholds[0] ?? CAP_THRESHOLDS[0];
}

export type ApronStatus =
  | "under-cap"
  | "over-cap"
  | "tax"
  | "first-apron"
  | "second-apron";

export function getApronStatus(payroll: number, cap: CapThresholds): ApronStatus {
  if (payroll >= cap.secondApron) return "second-apron";
  if (payroll >= cap.firstApron) return "first-apron";
  if (payroll >= cap.luxuryTax) return "tax";
  if (payroll >= cap.salaryCap) return "over-cap";
  return "under-cap";
}

/**
 * Payroll used for apron / tax status.
 * Prefer active roster + dead money — NOT Spotrac "Total Cap Allocations",
 * which includes free-agent holds and incomplete-roster charges and wildly
 * overstates how many teams sit above the second apron.
 */
export function effectivePayroll(p: {
  activeCap?: number | null;
  deadCap?: number | null;
  totalCap?: number | null;
}): number {
  const active = p.activeCap ?? 0;
  const dead = p.deadCap ?? 0;
  if (active > 0) return active + dead;
  return p.totalCap ?? 0;
}

export function roomToLine(payroll: number, line: number): number {
  return line - payroll;
}

export function apronStatusLabel(status: ApronStatus): string {
  switch (status) {
    case "under-cap":
      return "Under Cap";
    case "over-cap":
      return "Over Cap";
    case "tax":
      return "Luxury Tax";
    case "first-apron":
      return "First Apron";
    case "second-apron":
      return "Second Apron";
  }
}

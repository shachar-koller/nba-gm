export type TeamAbbr =
  | "ATL"
  | "BOS"
  | "BKN"
  | "CHA"
  | "CHI"
  | "CLE"
  | "DAL"
  | "DEN"
  | "DET"
  | "GSW"
  | "HOU"
  | "IND"
  | "LAC"
  | "LAL"
  | "MEM"
  | "MIA"
  | "MIL"
  | "MIN"
  | "NOP"
  | "NYK"
  | "OKC"
  | "ORL"
  | "PHI"
  | "PHX"
  | "POR"
  | "SAC"
  | "SAS"
  | "TOR"
  | "UTA"
  | "WAS";

export interface TeamInfo {
  abbr: TeamAbbr;
  name: string;
  city: string;
  fullName: string;
  conference: "East" | "West";
  division: string;
  primary: string;
  secondary: string;
  spotracSlug: string;
  espnId: string;
}

export type OptionType =
  | "none"
  | "player"
  | "team"
  | "ufa"
  | "rfa"
  | "qualifying"
  | "two-way"
  | "non-guaranteed"
  | "estimate";

export interface SalaryYear {
  season: string;
  amount: number | null;
  option: OptionType;
  display: string;
  pctOfCap?: number | null;
}

export interface PlayerContract {
  id: string;
  player: string;
  team: TeamAbbr;
  position: string;
  age: number | null;
  salaries: SalaryYear[];
  guaranteed: number | null;
  freeAgencyYear: string | null;
  freeAgencyType: "UFA" | "RFA" | null;
  contractYears: number;
  currentSalary: number | null;
  notes: string[];
}

export interface DraftPick {
  id: string;
  year: number;
  round: 1 | 2;
  originalTeam: TeamAbbr;
  currentOwner: TeamAbbr;
  description: string;
  protections: string | null;
  isSwap: boolean;
  isConditional: boolean;
  via: string | null;
}

export interface CapThresholds {
  season: string;
  salaryCap: number;
  luxuryTax: number;
  firstApron: number;
  secondApron: number;
  salaryFloor: number;
  notes?: string;
}

export interface TeamPayroll {
  team: TeamAbbr;
  season: string;
  totalCap: number;
  activeCap: number;
  deadCap: number;
  capSpace: number;
  playersActive: number;
  avgAge: number | null;
}

export interface AppData {
  updatedAt: string;
  source: string;
  currentSeason: string;
  capThresholds: CapThresholds[];
  teamPayrolls: TeamPayroll[];
  contracts: PlayerContract[];
  draftPicks: DraftPick[];
}

/** Per-game counting stats + season totals + derived advanced metrics. */
export interface PlayerSeasonStats {
  id: string;
  player: string;
  team: TeamAbbr | null;
  position: string;
  age: number | null;
  gp: number;
  min: number | null;
  pts: number | null;
  reb: number | null;
  ast: number | null;
  stl: number | null;
  blk: number | null;
  tov: number | null;
  pf: number | null;
  fgm: number | null;
  fga: number | null;
  fgPct: number | null;
  threePm: number | null;
  threePa: number | null;
  threePct: number | null;
  ftm: number | null;
  fta: number | null;
  ftPct: number | null;
  dd2: number;
  td3: number;
  ptsTotal: number | null;
  rebTotal: number | null;
  astTotal: number | null;
  stlTotal: number | null;
  blkTotal: number | null;
  tovTotal: number | null;
  minTotal: number | null;
  fgmTotal: number | null;
  fgaTotal: number | null;
  threePmTotal: number | null;
  threePaTotal: number | null;
  ftmTotal: number | null;
  ftaTotal: number | null;
  /** True shooting % (0–100 scale). */
  tsPct: number | null;
  /** Effective FG% (0–100 scale). */
  efgPct: number | null;
  /** 3PA / FGA. */
  threePar: number | null;
  /** FTA / FGA. */
  ftr: number | null;
  /** AST / TOV. */
  astTo: number | null;
  /** Turnover % (0–100 scale). */
  tovPct: number | null;
  /** NBA traditional efficiency per game. */
  eff: number | null;
  /** Steals + blocks per game. */
  stocks: number | null;
}

export interface PlayerStatsData {
  updatedAt: string;
  source: string;
  season: string;
  seasonType: string;
  players: PlayerSeasonStats[];
}

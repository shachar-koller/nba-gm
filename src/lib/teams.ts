import type { TeamAbbr, TeamInfo } from "./types";

export const TEAMS: TeamInfo[] = [
  { abbr: "ATL", name: "Hawks", city: "Atlanta", fullName: "Atlanta Hawks", conference: "East", division: "Southeast", primary: "#E03A3E", secondary: "#C1D32F", spotracSlug: "atlanta-hawks", espnId: "1" },
  { abbr: "BOS", name: "Celtics", city: "Boston", fullName: "Boston Celtics", conference: "East", division: "Atlantic", primary: "#007A33", secondary: "#BA9653", spotracSlug: "boston-celtics", espnId: "2" },
  { abbr: "BKN", name: "Nets", city: "Brooklyn", fullName: "Brooklyn Nets", conference: "East", division: "Atlantic", primary: "#000000", secondary: "#FFFFFF", spotracSlug: "brooklyn-nets", espnId: "17" },
  { abbr: "CHA", name: "Hornets", city: "Charlotte", fullName: "Charlotte Hornets", conference: "East", division: "Southeast", primary: "#1D1160", secondary: "#00788C", spotracSlug: "charlotte-hornets", espnId: "30" },
  { abbr: "CHI", name: "Bulls", city: "Chicago", fullName: "Chicago Bulls", conference: "East", division: "Central", primary: "#CE1141", secondary: "#000000", spotracSlug: "chicago-bulls", espnId: "4" },
  { abbr: "CLE", name: "Cavaliers", city: "Cleveland", fullName: "Cleveland Cavaliers", conference: "East", division: "Central", primary: "#860038", secondary: "#FDBB30", spotracSlug: "cleveland-cavaliers", espnId: "5" },
  { abbr: "DAL", name: "Mavericks", city: "Dallas", fullName: "Dallas Mavericks", conference: "West", division: "Southwest", primary: "#00538C", secondary: "#002B5E", spotracSlug: "dallas-mavericks", espnId: "6" },
  { abbr: "DEN", name: "Nuggets", city: "Denver", fullName: "Denver Nuggets", conference: "West", division: "Northwest", primary: "#0E2240", secondary: "#FEC524", spotracSlug: "denver-nuggets", espnId: "7" },
  { abbr: "DET", name: "Pistons", city: "Detroit", fullName: "Detroit Pistons", conference: "East", division: "Central", primary: "#C8102E", secondary: "#1D42BA", spotracSlug: "detroit-pistons", espnId: "8" },
  { abbr: "GSW", name: "Warriors", city: "Golden State", fullName: "Golden State Warriors", conference: "West", division: "Pacific", primary: "#1D428A", secondary: "#FFC72C", spotracSlug: "golden-state-warriors", espnId: "9" },
  { abbr: "HOU", name: "Rockets", city: "Houston", fullName: "Houston Rockets", conference: "West", division: "Southwest", primary: "#CE1141", secondary: "#000000", spotracSlug: "houston-rockets", espnId: "10" },
  { abbr: "IND", name: "Pacers", city: "Indiana", fullName: "Indiana Pacers", conference: "East", division: "Central", primary: "#002D62", secondary: "#FDBB30", spotracSlug: "indiana-pacers", espnId: "11" },
  { abbr: "LAC", name: "Clippers", city: "LA", fullName: "LA Clippers", conference: "West", division: "Pacific", primary: "#C8102E", secondary: "#1D428A", spotracSlug: "la-clippers", espnId: "12" },
  { abbr: "LAL", name: "Lakers", city: "Los Angeles", fullName: "Los Angeles Lakers", conference: "West", division: "Pacific", primary: "#552583", secondary: "#FDB927", spotracSlug: "los-angeles-lakers", espnId: "13" },
  { abbr: "MEM", name: "Grizzlies", city: "Memphis", fullName: "Memphis Grizzlies", conference: "West", division: "Southwest", primary: "#5D76A9", secondary: "#12173F", spotracSlug: "memphis-grizzlies", espnId: "29" },
  { abbr: "MIA", name: "Heat", city: "Miami", fullName: "Miami Heat", conference: "East", division: "Southeast", primary: "#98002E", secondary: "#F9A01B", spotracSlug: "miami-heat", espnId: "14" },
  { abbr: "MIL", name: "Bucks", city: "Milwaukee", fullName: "Milwaukee Bucks", conference: "East", division: "Central", primary: "#00471B", secondary: "#EEE1C6", spotracSlug: "milwaukee-bucks", espnId: "15" },
  { abbr: "MIN", name: "Timberwolves", city: "Minnesota", fullName: "Minnesota Timberwolves", conference: "West", division: "Northwest", primary: "#0C2340", secondary: "#236192", spotracSlug: "minnesota-timberwolves", espnId: "16" },
  { abbr: "NOP", name: "Pelicans", city: "New Orleans", fullName: "New Orleans Pelicans", conference: "West", division: "Southwest", primary: "#0C2340", secondary: "#C8102E", spotracSlug: "new-orleans-pelicans", espnId: "3" },
  { abbr: "NYK", name: "Knicks", city: "New York", fullName: "New York Knicks", conference: "East", division: "Atlantic", primary: "#006BB6", secondary: "#F58426", spotracSlug: "new-york-knicks", espnId: "18" },
  { abbr: "OKC", name: "Thunder", city: "Oklahoma City", fullName: "Oklahoma City Thunder", conference: "West", division: "Northwest", primary: "#007AC1", secondary: "#EF3B24", spotracSlug: "oklahoma-city-thunder", espnId: "25" },
  { abbr: "ORL", name: "Magic", city: "Orlando", fullName: "Orlando Magic", conference: "East", division: "Southeast", primary: "#0077C0", secondary: "#C4CED4", spotracSlug: "orlando-magic", espnId: "19" },
  { abbr: "PHI", name: "76ers", city: "Philadelphia", fullName: "Philadelphia 76ers", conference: "East", division: "Atlantic", primary: "#006BB6", secondary: "#ED174C", spotracSlug: "philadelphia-76ers", espnId: "20" },
  { abbr: "PHX", name: "Suns", city: "Phoenix", fullName: "Phoenix Suns", conference: "West", division: "Pacific", primary: "#1D1160", secondary: "#E56020", spotracSlug: "phoenix-suns", espnId: "21" },
  { abbr: "POR", name: "Trail Blazers", city: "Portland", fullName: "Portland Trail Blazers", conference: "West", division: "Northwest", primary: "#E03A3E", secondary: "#000000", spotracSlug: "portland-trail-blazers", espnId: "22" },
  { abbr: "SAC", name: "Kings", city: "Sacramento", fullName: "Sacramento Kings", conference: "West", division: "Pacific", primary: "#5A2D81", secondary: "#63727A", spotracSlug: "sacramento-kings", espnId: "23" },
  { abbr: "SAS", name: "Spurs", city: "San Antonio", fullName: "San Antonio Spurs", conference: "West", division: "Southwest", primary: "#C4CED4", secondary: "#000000", spotracSlug: "san-antonio-spurs", espnId: "24" },
  { abbr: "TOR", name: "Raptors", city: "Toronto", fullName: "Toronto Raptors", conference: "East", division: "Atlantic", primary: "#CE1141", secondary: "#000000", spotracSlug: "toronto-raptors", espnId: "28" },
  { abbr: "UTA", name: "Jazz", city: "Utah", fullName: "Utah Jazz", conference: "West", division: "Northwest", primary: "#002B5C", secondary: "#00471B", spotracSlug: "utah-jazz", espnId: "26" },
  { abbr: "WAS", name: "Wizards", city: "Washington", fullName: "Washington Wizards", conference: "East", division: "Southeast", primary: "#002B5C", secondary: "#E31837", spotracSlug: "washington-wizards", espnId: "27" },
];

export const TEAM_BY_ABBR: Record<TeamAbbr, TeamInfo> = Object.fromEntries(
  TEAMS.map((t) => [t.abbr, t])
) as Record<TeamAbbr, TeamInfo>;

const ALIASES: Record<string, TeamAbbr> = {
  ATL: "ATL",
  BOS: "BOS",
  BKN: "BKN",
  BRK: "BKN",
  NJN: "BKN",
  CHA: "CHA",
  CHO: "CHA",
  CHH: "CHA",
  CHI: "CHI",
  CLE: "CLE",
  DAL: "DAL",
  DEN: "DEN",
  DET: "DET",
  GSW: "GSW",
  GS: "GSW",
  HOU: "HOU",
  IND: "IND",
  LAC: "LAC",
  LAL: "LAL",
  MEM: "MEM",
  MIA: "MIA",
  MIL: "MIL",
  MIN: "MIN",
  NOP: "NOP",
  NO: "NOP",
  NOH: "NOP",
  NYK: "NYK",
  NY: "NYK",
  OKC: "OKC",
  SEA: "OKC",
  ORL: "ORL",
  PHI: "PHI",
  PHX: "PHX",
  PHO: "PHX",
  POR: "POR",
  SAC: "SAC",
  SAS: "SAS",
  SA: "SAS",
  TOR: "TOR",
  UTA: "UTA",
  UTAH: "UTA",
  WAS: "WAS",
  WSH: "WAS",
  WS: "WAS",
};

export function normalizeAbbr(value: string | null | undefined): TeamAbbr | null {
  if (!value) return null;
  const cleaned = value.trim().toUpperCase().replace(/[^A-Z]/g, "");
  return ALIASES[cleaned] ?? null;
}

export function teamLogoUrl(abbr: TeamAbbr): string {
  const team = TEAM_BY_ABBR[abbr];
  return `https://a.espncdn.com/i/teamlogos/nba/500/${team.espnId === "17" ? "bkn" : team.abbr.toLowerCase()}.png`;
}

/** ESPN CDN path by abbreviation (more reliable for most teams). */
export function espnLogo(abbr: TeamAbbr): string {
  const map: Partial<Record<TeamAbbr, string>> = {
    BKN: "bkn",
    NOP: "no",
    UTA: "utah",
    WAS: "wsh",
  };
  const slug = map[abbr] ?? abbr.toLowerCase();
  return `https://a.espncdn.com/i/teamlogos/nba/500/${slug}.png`;
}

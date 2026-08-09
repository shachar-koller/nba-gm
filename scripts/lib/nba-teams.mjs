export const NBA_TEAMS = Object.freeze([
  { abbr: "ATL", slug: "atlanta-hawks", name: "Atlanta Hawks" },
  { abbr: "BOS", slug: "boston-celtics", name: "Boston Celtics" },
  { abbr: "BKN", slug: "brooklyn-nets", name: "Brooklyn Nets" },
  { abbr: "CHA", slug: "charlotte-hornets", name: "Charlotte Hornets" },
  { abbr: "CHI", slug: "chicago-bulls", name: "Chicago Bulls" },
  { abbr: "CLE", slug: "cleveland-cavaliers", name: "Cleveland Cavaliers" },
  { abbr: "DAL", slug: "dallas-mavericks", name: "Dallas Mavericks" },
  { abbr: "DEN", slug: "denver-nuggets", name: "Denver Nuggets" },
  { abbr: "DET", slug: "detroit-pistons", name: "Detroit Pistons" },
  { abbr: "GSW", slug: "golden-state-warriors", name: "Golden State Warriors" },
  { abbr: "HOU", slug: "houston-rockets", name: "Houston Rockets" },
  { abbr: "IND", slug: "indiana-pacers", name: "Indiana Pacers" },
  { abbr: "LAC", slug: "la-clippers", name: "LA Clippers" },
  { abbr: "LAL", slug: "los-angeles-lakers", name: "Los Angeles Lakers" },
  { abbr: "MEM", slug: "memphis-grizzlies", name: "Memphis Grizzlies" },
  { abbr: "MIA", slug: "miami-heat", name: "Miami Heat" },
  { abbr: "MIL", slug: "milwaukee-bucks", name: "Milwaukee Bucks" },
  { abbr: "MIN", slug: "minnesota-timberwolves", name: "Minnesota Timberwolves" },
  { abbr: "NOP", slug: "new-orleans-pelicans", name: "New Orleans Pelicans" },
  { abbr: "NYK", slug: "new-york-knicks", name: "New York Knicks" },
  { abbr: "OKC", slug: "oklahoma-city-thunder", name: "Oklahoma City Thunder" },
  { abbr: "ORL", slug: "orlando-magic", name: "Orlando Magic" },
  { abbr: "PHI", slug: "philadelphia-76ers", name: "Philadelphia 76ers" },
  { abbr: "PHX", slug: "phoenix-suns", name: "Phoenix Suns" },
  { abbr: "POR", slug: "portland-trail-blazers", name: "Portland Trail Blazers" },
  { abbr: "SAC", slug: "sacramento-kings", name: "Sacramento Kings" },
  { abbr: "SAS", slug: "san-antonio-spurs", name: "San Antonio Spurs" },
  { abbr: "TOR", slug: "toronto-raptors", name: "Toronto Raptors" },
  { abbr: "UTA", slug: "utah-jazz", name: "Utah Jazz" },
  { abbr: "WAS", slug: "washington-wizards", name: "Washington Wizards" },
]);

export const TEAM_ABBRS = Object.freeze(NBA_TEAMS.map((team) => team.abbr));
export const TEAM_ABBR_SET = new Set(TEAM_ABBRS);
export const TEAM_NAME_TO_ABBR = Object.freeze(
  Object.fromEntries(
    NBA_TEAMS.flatMap((team) => {
      const names = [[team.name, team.abbr]];
      if (team.abbr === "LAC") names.push(["Los Angeles Clippers", team.abbr]);
      return names;
    })
  )
);

const TEAM_ALIASES = Object.freeze({
  BRK: "BKN",
  CHO: "CHA",
  PHO: "PHX",
  NO: "NOP",
  NOR: "NOP",
  NY: "NYK",
  SA: "SAS",
  SAN: "SAS",
  GS: "GSW",
  WSH: "WAS",
  UTH: "UTA",
  UTAH: "UTA",
});

export function normalizeTeamAbbr(raw) {
  if (!raw) return null;
  const compact = String(raw).trim().toUpperCase().replace(/[^A-Z]/g, "");
  const mapped = TEAM_ALIASES[compact] || compact;
  return TEAM_ABBR_SET.has(mapped) ? mapped : null;
}

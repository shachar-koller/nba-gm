#!/usr/bin/env node
/**
 * Live data refresh from Spotrac (contracts, payrolls, draft picks)
 * and official NBA cap thresholds.
 *
 * Usage: npm run refresh
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "data", "app-data.json");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const TEAMS = [
  { abbr: "ATL", slug: "atlanta-hawks" },
  { abbr: "BOS", slug: "boston-celtics" },
  { abbr: "BKN", slug: "brooklyn-nets" },
  { abbr: "CHA", slug: "charlotte-hornets" },
  { abbr: "CHI", slug: "chicago-bulls" },
  { abbr: "CLE", slug: "cleveland-cavaliers" },
  { abbr: "DAL", slug: "dallas-mavericks" },
  { abbr: "DEN", slug: "denver-nuggets" },
  { abbr: "DET", slug: "detroit-pistons" },
  { abbr: "GSW", slug: "golden-state-warriors" },
  { abbr: "HOU", slug: "houston-rockets" },
  { abbr: "IND", slug: "indiana-pacers" },
  { abbr: "LAC", slug: "la-clippers" },
  { abbr: "LAL", slug: "los-angeles-lakers" },
  { abbr: "MEM", slug: "memphis-grizzlies" },
  { abbr: "MIA", slug: "miami-heat" },
  { abbr: "MIL", slug: "milwaukee-bucks" },
  { abbr: "MIN", slug: "minnesota-timberwolves" },
  { abbr: "NOP", slug: "new-orleans-pelicans" },
  { abbr: "NYK", slug: "new-york-knicks" },
  { abbr: "OKC", slug: "oklahoma-city-thunder" },
  { abbr: "ORL", slug: "orlando-magic" },
  { abbr: "PHI", slug: "philadelphia-76ers" },
  { abbr: "PHX", slug: "phoenix-suns" },
  { abbr: "POR", slug: "portland-trail-blazers" },
  { abbr: "SAC", slug: "sacramento-kings" },
  { abbr: "SAS", slug: "san-antonio-spurs" },
  { abbr: "TOR", slug: "toronto-raptors" },
  { abbr: "UTA", slug: "utah-jazz" },
  { abbr: "WAS", slug: "washington-wizards" },
];

const ABBRS = new Set(TEAMS.map((t) => t.abbr));
const ALIAS = {
  BRK: "BKN",
  CHO: "CHA",
  PHO: "PHX",
  NO: "NOP",
  NY: "NYK",
  SA: "SAS",
  GS: "GSW",
  WSH: "WAS",
  UTH: "UTA",
};

const CAP_THRESHOLDS = [
  {
    season: "2026-27",
    salaryCap: 164961000,
    luxuryTax: 200428000,
    firstApron: 209015000,
    secondApron: 221686000,
    salaryFloor: 148465000,
    notes: "Official figures announced by the NBA (July 2026).",
  },
  {
    season: "2025-26",
    salaryCap: 154647000,
    luxuryTax: 187895000,
    firstApron: 195945000,
    secondApron: 207824000,
    salaryFloor: 139182000,
  },
  {
    season: "2024-25",
    salaryCap: 140588000,
    luxuryTax: 170814000,
    firstApron: 178132000,
    secondApron: 188931000,
    salaryFloor: 126529000,
  },
  {
    season: "2023-24",
    salaryCap: 136021000,
    luxuryTax: 165294000,
    firstApron: 172346000,
    secondApron: 182794000,
    salaryFloor: 122419000,
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.text();
}

function stripTags(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function parseMoney(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[$,\s]/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeAbbr(raw) {
  if (!raw) return null;
  const c = String(raw).trim().toUpperCase().replace(/[^A-Z]/g, "");
  const mapped = ALIAS[c] || c;
  return ABBRS.has(mapped) ? mapped : null;
}

function detectOption(pillClass, displayText) {
  const cls = (pillClass || "").toLowerCase();
  const text = (displayText || "").toUpperCase();
  if (cls.includes("pill-player") || text.includes("PO")) return "player";
  if (cls.includes("pill-club") || text.includes("TO") || text.includes("CLUB")) return "team";
  if (cls.includes("pill-ufa") || text.startsWith("UFA")) return "ufa";
  if (cls.includes("pill-rfa") || text.startsWith("RFA")) return "rfa";
  if (cls.includes("pill-estimate")) return "estimate";
  if (cls.includes("non-guaranteed") || cls.includes("pill-ng")) return "non-guaranteed";
  if (text.includes("TWO-WAY") || text.includes("TW")) return "two-way";
  return "none";
}

function extractOriginalTeam(description, fallbackOwner) {
  // Prefer explicit "via X" chain's first team, else first abbr that isn't owner when describing swaps
  const viaMatch = description.match(/via\s+([A-Z]{2,3}(?:\s+to\s+[A-Z]{2,3})*)/i);
  if (viaMatch) {
    const first = viaMatch[1].split(/\s+to\s+/i)[0];
    const a = normalizeAbbr(first);
    if (a) return a;
  }
  // "of DEN", "of MIL and NOP", "of BKN, PHI"
  const ofMatch = description.match(/\bof\s+([A-Z]{2,3})\b/);
  if (ofMatch) {
    const a = normalizeAbbr(ofMatch[1]);
    if (a) return a;
  }
  // Leading abbr in cell before notes
  const lead = description.match(/^([A-Z]{2,3})\b/);
  if (lead) {
    const a = normalizeAbbr(lead[1]);
    if (a) return a;
  }
  return fallbackOwner;
}

function parseConditions(description) {
  const isSwap = /swap/i.test(description);
  const isConditional =
    /\bif\b|\bleast favorable\b|\bmost favorable\b|\bmore favorable\b|\bprotected\b|\bunprotected\b|\bconvey/i.test(
      description
    );
  let protections = null;
  const prot = description.match(
    /(top-\d+\s*protected|[\d]+-[\d]+\s*protected|unprotected|If\s+[\d]+-[\d]+[^)]*)/i
  );
  if (prot) protections = prot[1].trim();
  else if (/If\s+\d/i.test(description)) {
    const m = description.match(/If[^.]+/i);
    if (m) protections = m[0].trim().slice(0, 120);
  }
  const viaMatch = description.match(/via\s+([^)]+)/i);
  const via = viaMatch ? viaMatch[1].replace(/\)$/, "").trim() : null;
  return { isSwap, isConditional, protections, via };
}

/** League-wide team payroll table */
async function fetchTeamPayrolls() {
  const year = 2026;
  const html = await fetchText(`https://www.spotrac.com/nba/cap/_/year/${year}`);
  const tableMatch = html.match(
    /<table class="table dataTable premium"[\s\S]*?<\/table>/i
  );
  if (!tableMatch) throw new Error("Could not find Spotrac cap table");
  const rows = [...tableMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);
  const payrolls = [];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map((c) =>
      stripTags(c[1])
    );
    if (cells.length < 6) continue;
    // Spotrac columns (2026):
    // Rank | Team | Players Active | Avg Age | Total Cap Allocations |
    // Cap Space All | Cap Space Projected Practical | Active | Active Top 3 | Dead Cap
    //
    // IMPORTANT: "Total Cap Allocations" includes FA holds + incomplete-roster
    // charges and is NOT the figure used for apron status. Prefer Active + Dead.
    const teamToken = cells[1].split(/\s+/)[0];
    const team = normalizeAbbr(teamToken);
    if (!team) continue;
    const totalAllocations = parseMoney(cells[4]) || 0;
    const active = parseMoney(cells[7]) || 0;
    const dead = parseMoney(cells[9]) || 0;
    payrolls.push({
      team,
      season: "2026-27",
      playersActive: Number(cells[2]) || 0,
      avgAge: Number(cells[3]) || null,
      totalCap: totalAllocations,
      capSpace: parseMoney(cells[5]) || 0,
      activeCap: active || totalAllocations,
      deadCap: dead,
    });
  }
  return payrolls;
}

/** Parse active roster contracts from a team yearly page */
function parseTeamContracts(html, teamAbbr) {
  const start = html.indexOf('id="dataTable-active-pending"');
  if (start < 0) {
    // fallback: first dataTable-yearly
    const alt = html.indexOf("dataTable-yearly");
    if (alt < 0) return [];
  }
  const tableStart = start >= 0 ? start : html.indexOf("dataTable-yearly");
  const tableEnd = html.indexOf("</table>", tableStart);
  const table = html.slice(tableStart, tableEnd + 8);

  const seasonHeaders = [...table.matchAll(/>\s*(20\d{2}-\d{2})\s*</g)].map((m) => m[1]);
  const tbodyStart = table.indexOf("<tbody>");
  const tbody = tbodyStart >= 0 ? table.slice(tbodyStart) : table;
  const rows = [...tbody.matchAll(/<tr class="">([\s\S]*?)<\/tr>/gi)];
  const contracts = [];

  for (const rowMatch of rows) {
    const row = rowMatch[1];
    const nameMatch = row.match(/class="link">([^<]+)/);
    const idMatch = row.match(/\/player\/_\/id\/(\d+)\/([^"']+)/);
    if (!nameMatch) continue;
    const player = nameMatch[1].trim();
    const posMatch = row.match(/text-center details-sm[^>]*>\s*([A-Z]{1,3})\s*</);
    const ageMatch = [...row.matchAll(/text-center details-sm[^>]*>\s*(\d{1,2})\s*</g)];
    const age = ageMatch.length ? Number(ageMatch[ageMatch.length - 1][1]) : null;
    const position = posMatch ? posMatch[1] : "";

    const salaryCells = [
      ...row.matchAll(
        /<td class=" text-center py-2[^"]*"[^>]*data-sort="([^"]*)"[^>]*>([\s\S]*?)<\/td>/gi
      ),
    ];
    const salaries = [];
    let freeAgencyYear = null;
    let freeAgencyType = null;

    salaryCells.forEach((cell, idx) => {
      const sortVal = cell[1];
      const inner = cell[2];
      const season = seasonHeaders[idx] || `Y${idx + 1}`;
      const pillClassMatch = inner.match(/class='([^']*pill[^']*)'|class="([^"]*pill[^"]*)"/i);
      const pillClass = pillClassMatch ? pillClassMatch[1] || pillClassMatch[2] : "";
      const moneyMatch = inner.match(/\$[\d,]+(?:\.\d+)?/);
      const displayRaw = stripTags(inner);
      const option = detectOption(pillClass, displayRaw);
      const amount =
        sortVal && Number(sortVal) > 100 ? Number(sortVal) : parseMoney(moneyMatch?.[0]);

      if (option === "ufa" || option === "rfa") {
        freeAgencyYear = season;
        freeAgencyType = option === "ufa" ? "UFA" : "RFA";
        const faDisplay = displayRaw.match(/(UFA|RFA)(?:\s*\/\s*\$[\d.]+[MBK]?)?/i);
        salaries.push({
          season,
          amount: null,
          option,
          display: faDisplay ? faDisplay[0].replace(/\s+/g, " ").trim() : option.toUpperCase(),
          pctOfCap: null,
        });
        return;
      }

      if (amount == null && !moneyMatch) {
        // empty year
        return;
      }

      const pctMatch = displayRaw.match(/([\d.]+)\s*%/);
      salaries.push({
        season,
        amount,
        option,
        display: moneyMatch ? moneyMatch[0] : displayRaw.slice(0, 40),
        pctOfCap: pctMatch ? Number(pctMatch[1]) : null,
      });
    });

    const guaranteed = salaries
      .filter((s) => s.amount && s.option !== "ufa" && s.option !== "rfa")
      .reduce((sum, s) => sum + (s.amount || 0), 0);

    const notes = [];
    if (/Trade Restriction/i.test(row)) {
      const tr = row.match(/Trade Restriction:([^"<]+)/i);
      if (tr) notes.push(`Trade restriction: ${tr[1].trim()}`);
    }

    const current = salaries.find((s) => s.amount != null)?.amount ?? null;
    const yearsWithMoney = salaries.filter((s) => s.amount != null).length;

    contracts.push({
      id: idMatch ? idMatch[1] : `${teamAbbr}-${player}`.toLowerCase().replace(/\s+/g, "-"),
      player,
      team: teamAbbr,
      position,
      age,
      salaries,
      guaranteed: guaranteed || null,
      freeAgencyYear,
      freeAgencyType,
      contractYears: yearsWithMoney,
      currentSalary: current,
      notes,
    });
  }
  return contracts;
}

/** Parse future draft picks owned by a team from their yearly page */
function parseTeamDraftPicks(html, ownerAbbr) {
  const idx = html.indexOf("Future Draft Picks");
  if (idx < 0) return [];
  const chunk = html.slice(idx, idx + 120000);
  const picks = [];

  for (const round of [1, 2]) {
    const paneRe = new RegExp(
      `id="round${round}_[^"]*"[^>]*>([\\s\\S]*?)(?:id="round[12]_|Unsigned Draft|TRANSACTIONS|</article>)`,
      "i"
    );
    const paneMatch = chunk.match(paneRe) || html.slice(idx).match(paneRe);
    const pane = paneMatch ? paneMatch[1] : "";
    if (!pane) continue;

    const yearParts = pane.split(/<h2>(20\d{2})<\/h2>/i);
    for (let i = 1; i < yearParts.length; i += 2) {
      const year = Number(yearParts[i]);
      const body = yearParts[i + 1] || "";
      const cells = [...body.matchAll(/<td class="\s*center[^"]*"[^>]*>([\s\S]*?)<\/td>/gi)];
      for (const cell of cells) {
        let text = stripTags(cell[1]);
        if (!text || text === "&nbsp;") continue;
        // Skip pure empty
        text = text.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        if (!text) continue;

        // Cell formats: "GSW", "DAL If 21-30 (via WAS)", "OKC Two most favorable..."
        // Left logo original team is in a separate td with img - we may only have ownership text
        // Extract original from description heuristics; default to owner if own pick
        const tokens = text.split(/\s+/);
        const firstAbbr = normalizeAbbr(tokens[0]);
        let description = text;
        let originalTeam = ownerAbbr;

        // If first token is an abbr, it often denotes the original/conveying team on the chart
        // On team yearly pages the cells show ownership labels like "GSW" for own pick
        // or "DAL If 21-30 (via WAS)" meaning they own DAL's pick with conditions
        if (firstAbbr) {
          // Own pick if only abbr or abbr is owner
          if (firstAbbr === ownerAbbr && tokens.length === 1) {
            originalTeam = ownerAbbr;
            description = `${ownerAbbr} own ${year} ${round === 1 ? "1st" : "2nd"}`;
          } else if (firstAbbr !== ownerAbbr) {
            originalTeam = firstAbbr;
            description = text;
          } else {
            originalTeam = ownerAbbr;
            description = text;
          }
        }

        // Try to get original from parent row logo
        // (handled below if needed)

        const { isSwap, isConditional, protections, via } = parseConditions(description);
        // Only keep picks that this owner actually controls:
        // - pure own pick
        // - text contains owner abbr or starts with other team they received
        const mentionsOwner = new RegExp(`\\b${ownerAbbr}\\b`).test(text);
        const isOwnSimple = firstAbbr === ownerAbbr || (!firstAbbr && mentionsOwner);
        const isAcquired = firstAbbr && firstAbbr !== ownerAbbr;
        // On yearly page, ALL listed picks are owned by this team (current owner view)
        // first abbr often = original team OR the owner itself
        if (firstAbbr === ownerAbbr) {
          originalTeam = ownerAbbr;
        } else if (firstAbbr) {
          originalTeam = firstAbbr;
        }

        // Avoid adding pure swap counterparty rows that are not owned
        // Heuristic: if text is "LAC Two most favorable..." and owner is OKC, OKC owns a piece
        // Include all non-empty cells from this team's chart - Spotrac lists their rights
        picks.push({
          id: `${year}-R${round}-${originalTeam}-${ownerAbbr}-${picks.length}`,
          year,
          round,
          originalTeam,
          currentOwner: ownerAbbr,
          description,
          protections,
          isSwap,
          isConditional: isConditional || Boolean(protections),
          via,
        });
      }
    }
  }
  return picks;
}

/**
 * Parse Spotrac future draft page (organized by current owner team).
 * More complete single-source for draft rights.
 */
async function fetchAllDraftPicks() {
  const html = await fetchText("https://www.spotrac.com/nba/draft/future");
  const mainIdx = html.indexOf('id="main"');
  const main = mainIdx >= 0 ? html.slice(mainIdx) : html;
  const picks = [];

  // Each team section: h2 ends with team full name after Round tabs
  const teamSections = [
    ...main.matchAll(
      /Round 2<\/button>\s*<\/li>\s*<\/ul>\s*([^<]+?)\s*<\/h2>([\s\S]*?)(?=Round 2<\/button>\s*<\/li>\s*<\/ul>\s*[^<]+?\s*<\/h2>|RECENT NEWS|THE SPOTRAC|$)/gi
    ),
  ];

  // Fallback: split by Future Draft Picks team headers
  let sections = teamSections;
  if (sections.length < 20) {
    // alternate: find "Atlanta Hawks" style names from TEAMS list
    sections = [];
    const fullNames = [
      "Atlanta Hawks",
      "Boston Celtics",
      "Brooklyn Nets",
      "Charlotte Hornets",
      "Chicago Bulls",
      "Cleveland Cavaliers",
      "Dallas Mavericks",
      "Denver Nuggets",
      "Detroit Pistons",
      "Golden State Warriors",
      "Houston Rockets",
      "Indiana Pacers",
      "LA Clippers",
      "Los Angeles Lakers",
      "Memphis Grizzlies",
      "Miami Heat",
      "Milwaukee Bucks",
      "Minnesota Timberwolves",
      "New Orleans Pelicans",
      "New York Knicks",
      "Oklahoma City Thunder",
      "Orlando Magic",
      "Philadelphia 76ers",
      "Phoenix Suns",
      "Portland Trail Blazers",
      "Sacramento Kings",
      "San Antonio Spurs",
      "Toronto Raptors",
      "Utah Jazz",
      "Washington Wizards",
    ];
    for (let i = 0; i < fullNames.length; i++) {
      const name = fullNames[i];
      const start = main.indexOf(name);
      if (start < 0) continue;
      // find a substantial section - search near Future-style tables
      // Use last occurrences by searching all
    }
    // Use all matches of team name followed by tab content
    for (const name of fullNames) {
      const re = new RegExp(
        `${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</h2>([\\s\\S]{0,80000}?)(?=(?:Atlanta Hawks|Boston Celtics|Brooklyn Nets|Charlotte Hornets|Chicago Bulls|Cleveland Cavaliers|Dallas Mavericks|Denver Nuggets|Detroit Pistons|Golden State Warriors|Houston Rockets|Indiana Pacers|LA Clippers|Los Angeles Lakers|Memphis Grizzlies|Miami Heat|Milwaukee Bucks|Minnesota Timberwolves|New Orleans Pelicans|New York Knicks|Oklahoma City Thunder|Orlando Magic|Philadelphia 76ers|Phoenix Suns|Portland Trail Blazers|Sacramento Kings|San Antonio Spurs|Toronto Raptors|Utah Jazz|Washington Wizards)\\s*</h2>|RECENT NEWS)`,
        "i"
      );
      const m = main.match(re);
      if (m) sections.push([null, name, m[1]]);
    }
  }

  const nameToAbbr = {
    "Atlanta Hawks": "ATL",
    "Boston Celtics": "BOS",
    "Brooklyn Nets": "BKN",
    "Charlotte Hornets": "CHA",
    "Chicago Bulls": "CHI",
    "Cleveland Cavaliers": "CLE",
    "Dallas Mavericks": "DAL",
    "Denver Nuggets": "DEN",
    "Detroit Pistons": "DET",
    "Golden State Warriors": "GSW",
    "Houston Rockets": "HOU",
    "Indiana Pacers": "IND",
    "LA Clippers": "LAC",
    "Los Angeles Clippers": "LAC",
    "Los Angeles Lakers": "LAL",
    "Memphis Grizzlies": "MEM",
    "Miami Heat": "MIA",
    "Milwaukee Bucks": "MIL",
    "Minnesota Timberwolves": "MIN",
    "New Orleans Pelicans": "NOP",
    "New York Knicks": "NYK",
    "Oklahoma City Thunder": "OKC",
    "Orlando Magic": "ORL",
    "Philadelphia 76ers": "PHI",
    "Phoenix Suns": "PHX",
    "Portland Trail Blazers": "POR",
    "Sacramento Kings": "SAC",
    "San Antonio Spurs": "SAS",
    "Toronto Raptors": "TOR",
    "Utah Jazz": "UTA",
    "Washington Wizards": "WAS",
  };

  console.log(`  Draft page team sections: ${sections.length}`);

  for (const sec of sections) {
    const teamName = (sec[1] || "").trim();
    const body = sec[2] || "";
    const owner = nameToAbbr[teamName];
    if (!owner) continue;

    for (const round of [1, 2]) {
      const paneRe = new RegExp(
        `id="round${round}_[^"]*"[^>]*>([\\s\\S]*?)(?:<div class="tab-pane|$)`,
        "i"
      );
      const pm = body.match(paneRe);
      let pane = pm ? pm[1] : "";
      if (!pane) {
        // Some sections only have one table structure without clean pan end
        pane = body;
      }

      const yearParts = pane.split(/<h2>(20\d{2})<\/h2>/i);
      for (let i = 1; i < yearParts.length; i += 2) {
        const year = Number(yearParts[i]);
        if (year < 2026 || year > 2035) continue;
        const yearBody = yearParts[i + 1] || "";

        // Each pick row: logo of original team + owner bar with optional note
        const rows = [...yearBody.matchAll(/<tr class="totals fw-normal"[^>]*>([\s\S]*?)<\/tr>/gi)];
        for (const row of rows) {
          const rowHtml = row[1];
          // original team from image alt or filename
          let original = null;
          const img = rowHtml.match(
            /images\/thumb\/(?:nba_)?([a-z0-9]+)\.png|alt="([A-Za-z\s]+)"/i
          );
          if (img) {
            if (img[2] && nameToAbbr[img[2]]) original = nameToAbbr[img[2]];
            else if (img[1]) {
              const map = {
                atl: "ATL",
                bos: "BOS",
                bkn: "BKN",
                bkn_2025: "BKN",
                cha: "CHA",
                chi: "CHI",
                cle: "CLE",
                dal: "DAL",
                den: "DEN",
                det: "DET",
                gs: "GSW",
                gsw: "GSW",
                hou: "HOU",
                ind: "IND",
                lac: "LAC",
                lal: "LAL",
                mem: "MEM",
                mia: "MIA",
                mil: "MIL",
                min: "MIN",
                no: "NOP",
                nop: "NOP",
                ny: "NYK",
                nyk: "NYK",
                okc: "OKC",
                orl: "ORL",
                orl_20251: "ORL",
                phi: "PHI",
                phx: "PHX",
                por: "POR",
                sac: "SAC",
                sa: "SAS",
                sas: "SAS",
                tor: "TOR",
                utah: "UTA",
                uta: "UTA",
                wsh: "WAS",
                was: "WAS",
              };
              const key = img[1].toLowerCase().replace(/[^a-z0-9]/g, "");
              original = map[key] || normalizeAbbr(img[1].slice(0, 3));
            }
          }

          // Owner text in bold bar + note
          const ownerBar = rowHtml.match(
            /fa-arrow-right-long[\s\S]*?<\/i>\s*([A-Z]{2,3})\s*</i
          );
          const noteMatch = rowHtml.match(
            /font-size:8px[^>]*>([\s\S]*?)<\/div>/i
          );
          const note = noteMatch ? stripTags(noteMatch[1]) : "";
          const barOwner = ownerBar ? normalizeAbbr(ownerBar[1]) : null;
          const currentOwner = barOwner || owner;

          // On the future page, the SECTION team is the current owner of the picks listed
          // Original is the left logo
          if (!original) original = extractOriginalTeam(note || currentOwner, currentOwner);

          // Only include if this section owner matches currentOwner or section
          const finalOwner = owner; // section is organized by owner
          if (barOwner && barOwner !== owner && !note) {
            // counterparty display row sometimes
          }

          const description =
            note ||
            (original === finalOwner
              ? `${finalOwner} own ${year} Round ${round}`
              : `${finalOwner} owns ${original} ${year} Round ${round}`);

          const { isSwap, isConditional, protections, via } = parseConditions(
            `${description} ${note}`
          );

          // Deduplicate later
          picks.push({
            id: `${year}-R${round}-${original}-${finalOwner}-${picks.length}`,
            year,
            round,
            originalTeam: original || finalOwner,
            currentOwner: finalOwner,
            description: description.trim(),
            protections,
            isSwap,
            isConditional: isConditional || Boolean(protections),
            via,
          });
        }
      }
    }
  }

  // Deduplicate by year-round-original-owner-description
  const seen = new Set();
  const unique = [];
  for (const p of picks) {
    const key = `${p.year}|${p.round}|${p.originalTeam}|${p.currentOwner}|${p.description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({ ...p, id: `${p.year}-R${p.round}-${p.originalTeam}-to-${p.currentOwner}-${unique.length}` });
  }
  return unique;
}

async function main() {
  console.log("Refreshing NBA front-office data from Spotrac + official cap figures…");
  const currentSeason = "2026-27";

  console.log("• Fetching team payrolls…");
  const teamPayrolls = await fetchTeamPayrolls();
  console.log(`  ${teamPayrolls.length} teams`);

  console.log("• Fetching future draft picks…");
  let draftPicks = [];
  try {
    draftPicks = await fetchAllDraftPicks();
    console.log(`  ${draftPicks.length} picks from future page`);
  } catch (e) {
    console.warn("  Future page failed:", e.message);
  }

  console.log("• Fetching team contracts (30 teams)…");
  const contracts = [];
  const draftFromTeams = [];

  for (let i = 0; i < TEAMS.length; i++) {
    const t = TEAMS[i];
    process.stdout.write(`  [${i + 1}/30] ${t.abbr}… `);
    try {
      const html = await fetchText(`https://www.spotrac.com/nba/${t.slug}/yearly`);
      const teamContracts = parseTeamContracts(html, t.abbr);
      contracts.push(...teamContracts);
      if (draftPicks.length < 50) {
        const dp = parseTeamDraftPicks(html, t.abbr);
        draftFromTeams.push(...dp);
      }
      console.log(`${teamContracts.length} players`);
    } catch (e) {
      console.log(`FAILED (${e.message})`);
    }
    await sleep(600); // be polite to Spotrac
  }

  if (draftPicks.length < 50 && draftFromTeams.length) {
    draftPicks = draftFromTeams;
    console.log(`  Using per-team draft picks: ${draftPicks.length}`);
  }

  // Deduplicate contracts by player+team
  const cSeen = new Set();
  const uniqueContracts = [];
  for (const c of contracts) {
    const key = `${c.player}|${c.team}`;
    if (cSeen.has(key)) continue;
    cSeen.add(key);
    uniqueContracts.push(c);
  }

  const data = {
    updatedAt: new Date().toISOString(),
    source: "Spotrac (live scrape) + NBA official cap announcements",
    currentSeason,
    capThresholds: CAP_THRESHOLDS,
    teamPayrolls,
    contracts: uniqueContracts,
    draftPicks,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(data, null, 2));
  console.log(`\nWrote ${OUT}`);
  console.log(
    `Summary: ${uniqueContracts.length} contracts, ${draftPicks.length} draft picks, ${teamPayrolls.length} payrolls`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

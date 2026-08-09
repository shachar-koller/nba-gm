import {
  NBA_TEAMS,
  TEAM_NAME_TO_ABBR,
  normalizeTeamAbbr,
} from "./nba-teams.mjs";

export function stripTags(html) {
  return String(html || "")
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

export function parseMoney(text) {
  if (!text) return null;
  const cleaned = String(text).replace(/[$,\s]/g, "").replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-" || cleaned === ".") return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

export function detectOption(pillClass, displayText) {
  const classes = String(pillClass || "").toLowerCase();
  const text = String(displayText || "").toUpperCase();
  if (classes.includes("pill-player") || text.includes("PO")) return "player";
  if (classes.includes("pill-club") || text.includes("TO") || text.includes("CLUB")) {
    return "team";
  }
  if (classes.includes("pill-ufa") || text.startsWith("UFA")) return "ufa";
  if (classes.includes("pill-rfa") || text.startsWith("RFA")) return "rfa";
  if (classes.includes("pill-estimate")) return "estimate";
  if (classes.includes("non-guaranteed") || classes.includes("pill-ng")) {
    return "non-guaranteed";
  }
  if (text.includes("TWO-WAY") || text.includes("TW")) return "two-way";
  return "none";
}

function extractOriginalTeam(description, fallbackOwner) {
  const viaMatch = description.match(/via\s+([A-Z]{2,3}(?:\s+to\s+[A-Z]{2,3})*)/i);
  if (viaMatch) {
    const first = viaMatch[1].split(/\s+to\s+/i)[0];
    const team = normalizeTeamAbbr(first);
    if (team) return team;
  }
  const ofMatch = description.match(/\bof\s+([A-Z]{2,3})\b/);
  if (ofMatch) {
    const team = normalizeTeamAbbr(ofMatch[1]);
    if (team) return team;
  }
  const lead = description.match(/^([A-Z]{2,3})\b/);
  if (lead) {
    const team = normalizeTeamAbbr(lead[1]);
    if (team) return team;
  }
  return fallbackOwner;
}

export function parseConditions(description) {
  const isSwap = /swap/i.test(description);
  const isConditional =
    /\bif\b|\bleast favorable\b|\bmost favorable\b|\bmore favorable\b|\bprotected\b|\bunprotected\b|\bconvey/i.test(
      description
    );
  let protections = null;
  const protection = description.match(
    /(top-\d+\s*protected|[\d]+-[\d]+\s*protected|unprotected|If\s+[\d]+-[\d]+[^)]*)/i
  );
  if (protection) protections = protection[1].trim();
  else if (/If\s+\d/i.test(description)) {
    const match = description.match(/If[^.]+/i);
    if (match) protections = match[0].trim().slice(0, 120);
  }
  const viaMatch = description.match(/via\s+([^)]+)/i);
  const via = viaMatch ? viaMatch[1].replace(/\)$/, "").trim() : null;
  return { isSwap, isConditional, protections, via };
}

/** Parse the league-wide cap table into one payroll record per recognized team. */
export function parseTeamPayrolls(html, { season = "2026-27" } = {}) {
  const tableMatch = html.match(
    /<table class="table dataTable premium"[\s\S]*?<\/table>/i
  );
  if (!tableMatch) throw new Error("Could not find Spotrac cap table");
  const rows = [...tableMatch[0].matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].slice(1);
  const payrolls = [];
  for (const row of rows) {
    const cells = [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
      (cell) => stripTags(cell[1])
    );
    if (cells.length < 10) continue;
    const team = normalizeTeamAbbr(cells[1].split(/\s+/)[0]);
    if (!team) continue;
    const totalAllocations = parseMoney(cells[4]) || 0;
    const active = parseMoney(cells[7]) || 0;
    payrolls.push({
      team,
      season,
      playersActive: Number(cells[2]) || 0,
      avgAge: Number(cells[3]) || null,
      totalCap: totalAllocations,
      capSpace: parseMoney(cells[5]) || 0,
      activeCap: active || totalAllocations,
      deadCap: parseMoney(cells[9]) || 0,
    });
  }
  return payrolls;
}

/** Parse active roster contracts from one team yearly page. */
export function parseTeamContracts(html, teamAbbr) {
  const start = html.indexOf('id="dataTable-active-pending"');
  if (start < 0 && html.indexOf("dataTable-yearly") < 0) return [];
  const tableStart = start >= 0 ? start : html.indexOf("dataTable-yearly");
  const tableEnd = html.indexOf("</table>", tableStart);
  if (tableEnd < 0) return [];
  const table = html.slice(tableStart, tableEnd + 8);

  const seasonHeaders = [...table.matchAll(/>\s*(20\d{2}-\d{2})\s*</g)].map(
    (match) => match[1]
  );
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
    const ageMatches = [
      ...row.matchAll(/text-center details-sm[^>]*>\s*(\d{1,2})\s*</g),
    ];
    const age = ageMatches.length ? Number(ageMatches.at(-1)[1]) : null;
    const position = posMatch ? posMatch[1] : "";

    const salaryCells = [
      ...row.matchAll(
        /<td class=" text-center py-2[^"]*"[^>]*data-sort="([^"]*)"[^>]*>([\s\S]*?)<\/td>/gi
      ),
    ];
    const salaries = [];
    let freeAgencyYear = null;
    let freeAgencyType = null;

    salaryCells.forEach((cell, index) => {
      const sortValue = cell[1];
      const inner = cell[2];
      const salarySeason = seasonHeaders[index] || `Y${index + 1}`;
      const pillClassMatch = inner.match(
        /class='([^']*pill[^']*)'|class="([^"]*pill[^"]*)"/i
      );
      const pillClass = pillClassMatch
        ? pillClassMatch[1] || pillClassMatch[2]
        : "";
      const moneyMatch = inner.match(/\$[\d,]+(?:\.\d+)?/);
      const displayRaw = stripTags(inner);
      const option = detectOption(pillClass, displayRaw);
      const amount =
        sortValue && Number(sortValue) > 100
          ? Number(sortValue)
          : parseMoney(moneyMatch?.[0]);

      if (option === "ufa" || option === "rfa") {
        freeAgencyYear = salarySeason;
        freeAgencyType = option === "ufa" ? "UFA" : "RFA";
        const faDisplay = displayRaw.match(/(UFA|RFA)(?:\s*\/\s*\$[\d.]+[MBK]?)?/i);
        salaries.push({
          season: salarySeason,
          amount: null,
          option,
          display: faDisplay
            ? faDisplay[0].replace(/\s+/g, " ").trim()
            : option.toUpperCase(),
          pctOfCap: null,
        });
        return;
      }

      if (amount == null && !moneyMatch) return;
      const pctMatch = displayRaw.match(/([\d.]+)\s*%/);
      salaries.push({
        season: salarySeason,
        amount,
        option,
        display: moneyMatch ? moneyMatch[0] : displayRaw.slice(0, 40),
        pctOfCap: pctMatch ? Number(pctMatch[1]) : null,
      });
    });

    const guaranteed = salaries
      .filter((salary) => salary.amount && salary.option !== "ufa" && salary.option !== "rfa")
      .reduce((sum, salary) => sum + (salary.amount || 0), 0);
    const notes = [];
    if (/Trade Restriction/i.test(row)) {
      const restriction = row.match(/Trade Restriction:([^"<]+)/i);
      if (restriction) notes.push(`Trade restriction: ${restriction[1].trim()}`);
    }
    const currentSalary = salaries.find((salary) => salary.amount != null)?.amount ?? null;

    contracts.push({
      id: idMatch
        ? idMatch[1]
        : `${teamAbbr}-${player}`.toLowerCase().replace(/\s+/g, "-"),
      player,
      team: teamAbbr,
      position,
      age,
      salaries,
      guaranteed: guaranteed || null,
      freeAgencyYear,
      freeAgencyType,
      contractYears: salaries.filter((salary) => salary.amount != null).length,
      currentSalary,
      notes,
    });
  }
  return contracts;
}

/** Derive the current payroll from the summary on the same team yearly page. */
export function parseTeamPayrollFromYearly(
  html,
  teamAbbr,
  contracts,
  { season = "2026-27" } = {}
) {
  if (!Array.isArray(contracts)) {
    throw new TypeError("contracts must be an array");
  }

  const tableStart = String(html).match(
    /<table\b[^>]*\bid=(?:"dataTable-summary"|'dataTable-summary')[^>]*>/i
  );
  if (!tableStart) throw new Error("Could not find Spotrac team cap summary");
  const start = tableStart.index;
  const end = html.indexOf("</table>", start);
  if (end < 0) throw new Error("Spotrac team cap summary is incomplete");
  const table = html.slice(start, end + 8);

  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)].map(
    (row) =>
      [...row[1].matchAll(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(
        (cell) => stripTags(cell[1])
      )
  );
  const capHeader = rows.find(
    (cells) => cells[0]?.toUpperCase() === "CAP" && cells.slice(1).includes(season)
  );
  const seasonIndex = capHeader?.slice(1).indexOf(season) ?? -1;
  if (seasonIndex < 0) {
    throw new Error(`Spotrac team cap summary does not include ${season}`);
  }

  const summary = new Map();
  for (const cells of rows) {
    if (cells.length <= seasonIndex + 1) continue;
    summary.set(cells[0].toLowerCase(), parseMoney(cells[seasonIndex + 1]));
  }

  const requiredRows = [
    "active cap",
    "dead cap",
    "total cap allocations",
    "cap space",
  ];
  const missingRows = requiredRows.filter((label) => !summary.has(label));
  if (missingRows.length) {
    throw new Error(
      `Spotrac ${teamAbbr} cap summary is missing ${missingRows.join(", ")} for ${season}`
    );
  }

  const activeCap = summary.get("active cap");
  const deadCap = summary.get("dead cap") ?? 0;
  const totalCap = summary.get("total cap allocations");
  const capSpace = summary.get("cap space");
  if (activeCap == null || activeCap <= 0) {
    throw new Error(`Spotrac ${teamAbbr} cap summary has no active cap for ${season}`);
  }
  if (totalCap == null || totalCap <= 0) {
    throw new Error(`Spotrac ${teamAbbr} cap summary has no total allocations for ${season}`);
  }
  if (capSpace == null) {
    throw new Error(`Spotrac ${teamAbbr} cap summary has no cap space for ${season}`);
  }

  const ages = contracts
    .map((contract) => contract.age)
    .filter((age) => Number.isFinite(age));
  const avgAge = ages.length
    ? Math.round((ages.reduce((sum, age) => sum + age, 0) / ages.length) * 10) / 10
    : null;

  return {
    team: teamAbbr,
    season,
    playersActive: contracts.length,
    avgAge,
    totalCap,
    capSpace,
    activeCap,
    deadCap,
  };
}

/** Parse future draft picks from one team's yearly page. */
export function parseTeamDraftPicks(html, ownerAbbr) {
  const index = html.indexOf("Future Draft Picks");
  if (index < 0) return [];
  const chunk = html.slice(index, index + 120_000);
  const picks = [];

  for (const round of [1, 2]) {
    const panePattern = new RegExp(
      `id="round${round}_[^"]*"[^>]*>([\\s\\S]*?)(?:id="round[12]_|Unsigned Draft|TRANSACTIONS|</article>)`,
      "i"
    );
    const paneMatch = chunk.match(panePattern) || html.slice(index).match(panePattern);
    const pane = paneMatch ? paneMatch[1] : "";
    if (!pane) continue;

    const yearParts = pane.split(/<h2>(20\d{2})<\/h2>/i);
    for (let part = 1; part < yearParts.length; part += 2) {
      const year = Number(yearParts[part]);
      const body = yearParts[part + 1] || "";
      const cells = [
        ...body.matchAll(/<td class="\s*center[^"]*"[^>]*>([\s\S]*?)<\/td>/gi),
      ];
      for (const cell of cells) {
        const text = stripTags(cell[1]).replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
        if (!text) continue;
        const tokens = text.split(/\s+/);
        const firstTeam = normalizeTeamAbbr(tokens[0]);
        let description = text;
        let originalTeam = ownerAbbr;
        if (firstTeam === ownerAbbr && tokens.length === 1) {
          description = `${ownerAbbr} own ${year} ${round === 1 ? "1st" : "2nd"}`;
        } else if (firstTeam) {
          originalTeam = firstTeam;
        }
        const conditions = parseConditions(description);
        picks.push({
          id: `${year}-R${round}-${originalTeam}-${ownerAbbr}-${picks.length}`,
          year,
          round,
          originalTeam,
          currentOwner: ownerAbbr,
          description,
          protections: conditions.protections,
          isSwap: conditions.isSwap,
          isConditional: conditions.isConditional || Boolean(conditions.protections),
          via: conditions.via,
        });
      }
    }
  }
  return picks;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const IMAGE_TEAM_MAP = Object.freeze({
  atl: "ATL", bos: "BOS", bkn: "BKN", bkn2025: "BKN", cha: "CHA",
  chi: "CHI", cle: "CLE", dal: "DAL", den: "DEN", det: "DET",
  gs: "GSW", gsw: "GSW", hou: "HOU", ind: "IND", lac: "LAC",
  lal: "LAL", mem: "MEM", mia: "MIA", mil: "MIL", min: "MIN",
  no: "NOP", nop: "NOP", ny: "NYK", nyk: "NYK", okc: "OKC",
  orl: "ORL", orl20251: "ORL", phi: "PHI", phx: "PHX", por: "POR",
  sac: "SAC", sa: "SAS", sas: "SAS", tor: "TOR", utah: "UTA",
  uta: "UTA", wsh: "WAS", was: "WAS",
});

function leagueDraftSections(main) {
  const primary = [
    ...main.matchAll(
      /Round 2<\/button>\s*<\/li>\s*<\/ul>\s*([^<]+?)\s*<\/h2>([\s\S]*?)(?=Round 2<\/button>\s*<\/li>\s*<\/ul>\s*[^<]+?\s*<\/h2>|RECENT NEWS|THE SPOTRAC|$)/gi
    ),
  ];
  if (primary.length >= 20) return primary.map((match) => [match[1], match[2]]);

  const sections = [];
  const names = NBA_TEAMS.flatMap((team) =>
    team.abbr === "LAC" ? [team.name, "Los Angeles Clippers"] : [team.name]
  );
  const lookahead = names.map(escapeRegExp).join("|");
  for (const name of names) {
    const pattern = new RegExp(
      `${escapeRegExp(name)}\\s*</h2>([\\s\\S]{0,80000}?)(?=(?:${lookahead})\\s*</h2>|RECENT NEWS|THE SPOTRAC|$)`,
      "i"
    );
    const match = main.match(pattern);
    if (match) sections.push([name, match[1]]);
  }
  return sections;
}

function originalTeamFromRow(rowHtml) {
  const image = rowHtml.match(
    /images\/thumb\/(?:nba_)?([a-z0-9_-]+)\.png|alt="([A-Za-z\s]+)"/i
  );
  if (!image) return null;
  const byName = image[2] ? TEAM_NAME_TO_ABBR[image[2].trim()] : null;
  if (byName) return byName;
  if (!image[1]) return null;
  const key = image[1].toLowerCase().replace(/[^a-z0-9]/g, "");
  return IMAGE_TEAM_MAP[key] || normalizeTeamAbbr(image[1].slice(0, 3));
}

/** Parse Spotrac's league future-draft page, which is grouped by current owner. */
export function parseLeagueDraftPicks(html) {
  const mainIndex = html.indexOf('id="main"');
  const main = mainIndex >= 0 ? html.slice(mainIndex) : html;
  const picks = [];

  for (const [teamNameRaw, body] of leagueDraftSections(main)) {
    const teamName = teamNameRaw.trim();
    const owner = TEAM_NAME_TO_ABBR[teamName];
    if (!owner) continue;

    for (const round of [1, 2]) {
      const panePattern = new RegExp(
        `id="round${round}_[^"]*"[^>]*>([\\s\\S]*?)(?:<div class="tab-pane|$)`,
        "i"
      );
      const paneMatch = body.match(panePattern);
      const pane = paneMatch ? paneMatch[1] : body;
      const yearParts = pane.split(/<h2>(20\d{2})<\/h2>/i);

      for (let part = 1; part < yearParts.length; part += 2) {
        const year = Number(yearParts[part]);
        if (year < 2026 || year > 2035) continue;
        const yearBody = yearParts[part + 1] || "";
        const rows = [
          ...yearBody.matchAll(
            /<tr class="totals fw-normal"[^>]*>([\s\S]*?)<\/tr>/gi
          ),
        ];
        for (const row of rows) {
          const rowHtml = row[1];
          let originalTeam = originalTeamFromRow(rowHtml);
          const noteMatch = rowHtml.match(
            /font-size:8px[^>]*>([\s\S]*?)<\/div>/i
          );
          const note = noteMatch ? stripTags(noteMatch[1]) : "";
          const ownerBar = rowHtml.match(
            /fa-arrow-right-long[\s\S]*?<\/i>\s*([A-Z]{2,3})\s*<\/i/i
          );
          const barTeam = ownerBar ? normalizeTeamAbbr(ownerBar[1]) : null;
          if (!originalTeam) {
            originalTeam = extractOriginalTeam(
              note || barTeam || owner,
              barTeam || owner
            );
          }
          const description =
            note ||
            (originalTeam === owner
              ? `${owner} own ${year} Round ${round}`
              : `${owner} owns ${originalTeam} ${year} Round ${round}`);
          const conditions = parseConditions(description);

          picks.push({
            id: `${year}-R${round}-${originalTeam}-${owner}-${picks.length}`,
            year,
            round,
            originalTeam: originalTeam || owner,
            currentOwner: owner,
            description: description.trim(),
            protections: conditions.protections,
            isSwap: conditions.isSwap,
            isConditional: conditions.isConditional || Boolean(conditions.protections),
            via: conditions.via,
          });
        }
      }
    }
  }

  const seen = new Set();
  const unique = [];
  for (const pick of picks) {
    const key = `${pick.year}|${pick.round}|${pick.originalTeam}|${pick.currentOwner}|${pick.description}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push({
      ...pick,
      id: `${pick.year}-R${pick.round}-${pick.originalTeam}-to-${pick.currentOwner}-${unique.length}`,
    });
  }
  return unique;
}

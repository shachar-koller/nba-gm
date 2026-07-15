#!/usr/bin/env node
/**
 * Fetch NBA regular-season player stats (basic + computed advanced)
 * from ESPN's public statistics API → src/data/player-stats.json
 *
 * Usage: node scripts/fetch-player-stats.mjs
 *        (also invoked by npm run refresh)
 */
import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "src", "data", "player-stats.json");
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** ESPN season year for the just-completed / current regular season. */
const SEASON_YEAR = 2026;
const SEASON_LABEL = "2025-26";

const VALID = new Set([
  "ATL", "BOS", "BKN", "CHA", "CHI", "CLE", "DAL", "DEN", "DET", "GSW",
  "HOU", "IND", "LAC", "LAL", "MEM", "MIA", "MIL", "MIN", "NOP", "NYK",
  "OKC", "ORL", "PHI", "PHX", "POR", "SAC", "SAS", "TOR", "UTA", "WAS",
]);

const ALIAS = {
  GS: "GSW",
  NO: "NOP",
  NY: "NYK",
  SA: "SAS",
  UTAH: "UTA",
  WSH: "WAS",
  PHO: "PHX",
  BRK: "BKN",
  CHO: "CHA",
  NOR: "NOP",
  SAN: "SAS",
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function normalizeTeam(raw) {
  if (!raw) return null;
  const c = String(raw).trim().toUpperCase().replace(/\s+/g, "");
  const mapped = ALIAS[c] || c;
  return VALID.has(mapped) ? mapped : null;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

function catNames(categories) {
  const out = {};
  for (const c of categories) out[c.name] = c.names;
  return out;
}

function zipStats(names, values) {
  const d = {};
  for (let i = 0; i < names.length; i++) d[names[i]] = values[i];
  return d;
}

function r1(x) {
  if (x == null || Number.isNaN(Number(x))) return null;
  return Math.round(Number(x) * 10) / 10;
}

function r2(x) {
  if (x == null || Number.isNaN(Number(x))) return null;
  return Math.round(Number(x) * 100) / 100;
}

function r3(x) {
  if (x == null || Number.isNaN(Number(x))) return null;
  return Math.round(Number(x) * 1000) / 1000;
}

function intOrNull(x) {
  if (x == null || Number.isNaN(Number(x))) return null;
  return Math.round(Number(x));
}

function buildPlayer(ath, stats) {
  const team = normalizeTeam(ath.teamShortName);
  const pos = ath.position?.abbreviation || "";
  const gp = stats.gamesPlayed || 0;

  const ptsT = stats.points;
  const fgaT = stats.fieldGoalsAttempted;
  const fgmT = stats.fieldGoalsMade;
  const tpmT = stats.threePointFieldGoalsMade;
  const tpaT = stats.threePointFieldGoalsAttempted;
  const ftaT = stats.freeThrowsAttempted;
  const ftmT = stats.freeThrowsMade;
  const astT = stats.assists;
  const tovT = stats.turnovers;
  const rebT = stats.rebounds;
  const stlT = stats.steals;
  const blkT = stats.blocks;
  const minT = stats.minutes;

  let tsPct = null;
  if (ptsT != null && fgaT != null && ftaT != null) {
    const denom = 2 * (fgaT + 0.44 * ftaT);
    if (denom > 0) tsPct = r1((100 * ptsT) / denom);
  }

  let efgPct = null;
  if (fgmT != null && tpmT != null && fgaT) {
    efgPct = r1((100 * (fgmT + 0.5 * tpmT)) / fgaT);
  }

  let threePar = null;
  if (tpaT != null && fgaT) threePar = r3(tpaT / fgaT);

  let ftr = null;
  if (ftaT != null && fgaT) ftr = r3(ftaT / fgaT);

  let astTo = null;
  if (astT != null && tovT != null && tovT > 0) astTo = r2(astT / tovT);

  let tovPct = null;
  if (tovT != null && fgaT != null && ftaT != null) {
    const denom = fgaT + 0.44 * ftaT + tovT;
    if (denom > 0) tovPct = r1((100 * tovT) / denom);
  }

  let eff = null;
  if (
    gp &&
    [ptsT, rebT, astT, stlT, blkT, fgmT, fgaT, ftmT, ftaT, tovT].every((v) => v != null)
  ) {
    const total =
      ptsT +
      rebT +
      astT +
      stlT +
      blkT -
      (fgaT - fgmT) -
      (ftaT - ftmT) -
      tovT;
    eff = r1(total / gp);
  }

  const stl = stats.avgSteals;
  const blk = stats.avgBlocks;
  const stocks = stl != null && blk != null ? r1(stl + blk) : null;

  return {
    id: String(ath.id),
    player:
      ath.displayName ||
      `${ath.firstName || ""} ${ath.lastName || ""}`.trim(),
    team,
    position: pos,
    age: ath.age ?? null,
    gp: Math.round(gp) || 0,
    min: r1(stats.avgMinutes),
    pts: r1(stats.avgPoints),
    reb: r1(stats.avgRebounds),
    ast: r1(stats.avgAssists),
    stl: r1(stl),
    blk: r1(blk),
    tov: r1(stats.avgTurnovers),
    pf: r1(stats.avgFouls),
    fgm: r1(stats.avgFieldGoalsMade),
    fga: r1(stats.avgFieldGoalsAttempted),
    fgPct: r1(stats.fieldGoalPct),
    threePm: r1(stats.avgThreePointFieldGoalsMade),
    threePa: r1(stats.avgThreePointFieldGoalsAttempted),
    threePct: r1(stats.threePointFieldGoalPct),
    ftm: r1(stats.avgFreeThrowsMade),
    fta: r1(stats.avgFreeThrowsAttempted),
    ftPct: r1(stats.freeThrowPct),
    dd2: Math.round(stats.doubleDouble || 0),
    td3: Math.round(stats.tripleDouble || 0),
    ptsTotal: intOrNull(ptsT),
    rebTotal: intOrNull(rebT),
    astTotal: intOrNull(astT),
    stlTotal: intOrNull(stlT),
    blkTotal: intOrNull(blkT),
    tovTotal: intOrNull(tovT),
    minTotal: intOrNull(minT),
    fgmTotal: intOrNull(fgmT),
    fgaTotal: intOrNull(fgaT),
    threePmTotal: intOrNull(tpmT),
    threePaTotal: intOrNull(tpaT),
    ftmTotal: intOrNull(ftmT),
    ftaTotal: intOrNull(ftaT),
    tsPct,
    efgPct,
    threePar,
    ftr,
    astTo,
    tovPct,
    eff,
    stocks,
  };
}

async function main() {
  const base =
    "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba/statistics/byathlete" +
    `?region=us&lang=en&contentorigin=espn&isqualified=false&limit=100` +
    `&sort=offensive.avgPoints%3Adesc&season=${SEASON_YEAR}&seasontype=2`;

  console.log(`Fetching ${SEASON_LABEL} player stats from ESPN…`);
  const first = await fetchJson(`${base}&page=1`);
  const pages = first.pagination.pages;
  const namesByCat = catNames(first.categories);
  const rows = [...first.athletes];
  console.log(`  page 1/${pages} (${rows.length})`);

  for (let p = 2; p <= pages; p++) {
    await sleep(350);
    const data = await fetchJson(`${base}&page=${p}`);
    rows.push(...data.athletes);
    console.log(`  page ${p}/${pages} (${rows.length})`);
  }

  const byId = new Map();
  for (const row of rows) {
    const stats = {};
    for (const c of row.categories) {
      const names = namesByCat[c.name] || [];
      Object.assign(stats, zipStats(names, c.values || []));
    }
    const player = buildPlayer(row.athlete, stats);
    const prev = byId.get(player.id);
    if (!prev || player.gp > prev.gp) byId.set(player.id, player);
  }

  const players = [...byId.values()].sort(
    (a, b) => (b.pts ?? 0) - (a.pts ?? 0) || a.player.localeCompare(b.player)
  );

  const payload = {
    updatedAt: new Date().toISOString(),
    source: "ESPN public statistics API",
    season: SEASON_LABEL,
    seasonType: "Regular Season",
    players,
  };

  await mkdir(dirname(OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload));
  console.log(`Wrote ${OUT}`);
  console.log(`Summary: ${players.length} players · ${SEASON_LABEL} regular season`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

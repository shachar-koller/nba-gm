#!/usr/bin/env node
/**
 * Refresh contracts, payrolls, and draft picks from Spotrac, validate the
 * complete league snapshot, then atomically replace the last-good JSON file.
 *
 * Usage: npm run refresh
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { NBA_TEAMS } from "./lib/nba-teams.mjs";
import {
  parseLeagueDraftPicks,
  parseTeamContracts,
  parseTeamDraftPicks,
  parseTeamPayrollFromYearly,
  parseTeamPayrolls,
} from "./lib/spotrac-parsers.mjs";
import {
  fetchTextWithRetry,
  writeValidatedJsonAtomic,
} from "./lib/pipeline.mjs";
import {
  validateAppDataSnapshot,
  validateLeagueDraftPicks,
} from "./lib/validate-snapshots.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const OUT = join(SCRIPT_DIR, "..", "src", "data", "app-data.json");
const CURRENT_SEASON = "2026-27";
const SPOTRAC_YEAR = 2026;
const MIN_LEAGUE_DRAFT_PICKS = 50;
const MIN_CONTRACTS_PER_TEAM = 8;
const MIN_SALARY_CONTRACTS_PER_TEAM = 5;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchText(url, transform) {
  return fetchTextWithRetry(
    url,
    {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
      },
    },
    {
      attempts: 4,
      baseDelayMs: 750,
      maxDelayMs: 6_000,
      timeoutMs: 25_000,
      transform,
      onRetry: ({ attempt, attempts, error, waitMs }) => {
        console.warn(
          `    retry ${attempt + 1}/${attempts} in ${Math.ceil(waitMs)}ms (${error.message})`
        );
      },
    }
  );
}

function dedupeContracts(contracts) {
  const seen = new Set();
  return contracts.filter((contract) => {
    const key = `${contract.player}|${contract.team}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function dedupeDraftPicks(picks) {
  const seen = new Set();
  return picks.filter((pick) => {
    const key = `${pick.year}|${pick.round}|${pick.originalTeam}|${pick.currentOwner}|${pick.description}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseCompleteLeagueDraftPicks(html) {
  const picks = parseLeagueDraftPicks(html);
  return validateLeagueDraftPicks(picks, {
    minDraftPicks: MIN_LEAGUE_DRAFT_PICKS,
  });
}

function parseTeamSnapshot(html, team, includeDraftPicks) {
  const contracts = parseTeamContracts(html, team.abbr);
  if (contracts.length < MIN_CONTRACTS_PER_TEAM) {
    throw new Error(
      `contract parser returned ${contracts.length} players; expected at least ${MIN_CONTRACTS_PER_TEAM}`
    );
  }

  const salaryContracts = contracts.filter(
    (contract) =>
      Number.isFinite(contract.currentSalary) ||
      contract.salaries.some((salary) => Number.isFinite(salary.amount))
  ).length;
  if (salaryContracts < MIN_SALARY_CONTRACTS_PER_TEAM) {
    throw new Error(
      `contract parser returned salary data for ${salaryContracts} players; expected at least ${MIN_SALARY_CONTRACTS_PER_TEAM}`
    );
  }

  const payroll = parseTeamPayrollFromYearly(html, team.abbr, contracts, {
    season: CURRENT_SEASON,
  });
  const draftPicks = includeDraftPicks
    ? parseTeamDraftPicks(html, team.abbr)
    : [];
  if (includeDraftPicks && draftPicks.length === 0) {
    throw new Error("future-draft parser returned zero owned picks");
  }

  return { contracts, payroll, draftPicks };
}

async function main() {
  console.log("Refreshing NBA front-office data from Spotrac + official cap figures…");

  // Spotrac sometimes serves a reduced mobile league table. Team yearly pages
  // are authoritative for output; this optional request is only a cross-check.
  const leaguePayrollCheck =
    process.env.SPOTRAC_CHECK_LEAGUE_CAP === "1"
      ? fetchText(
          `https://www.spotrac.com/nba/cap/_/year/${SPOTRAC_YEAR}`,
          (html) => {
            const payrolls = parseTeamPayrolls(html, {
              season: CURRENT_SEASON,
            });
            if (payrolls.length !== NBA_TEAMS.length) {
              throw new Error(
                `league cap parser covered ${payrolls.length}/${NBA_TEAMS.length} teams`
              );
            }
            return payrolls;
          }
        )
          .catch((error) => {
            console.warn(`  Optional league cap check unavailable: ${error.message}`);
            return [];
          })
      : null;

  console.log("• Fetching future draft picks…");
  let draftPicks = [];
  let needsTeamDraftFallback = true;
  try {
    draftPicks = await fetchText(
      "https://www.spotrac.com/nba/draft/future",
      parseCompleteLeagueDraftPicks
    );
    needsTeamDraftFallback = false;
    console.log(`  ${draftPicks.length} picks from future page`);
  } catch (error) {
    console.warn(`  Future page failed after retries: ${error.message}`);
  }

  console.log("• Fetching team contracts (30 teams)…");
  const contracts = [];
  const teamPayrolls = [];
  const draftFromTeams = [];
  const failedTeams = [];

  for (let index = 0; index < NBA_TEAMS.length; index += 1) {
    const team = NBA_TEAMS[index];
    process.stdout.write(`  [${index + 1}/30] ${team.abbr}… `);
    try {
      const teamSnapshot = await fetchText(
        `https://www.spotrac.com/nba/${team.slug}/yearly`,
        (html) => parseTeamSnapshot(html, team, needsTeamDraftFallback)
      );
      contracts.push(...teamSnapshot.contracts);
      teamPayrolls.push(teamSnapshot.payroll);
      if (needsTeamDraftFallback) {
        draftFromTeams.push(...teamSnapshot.draftPicks);
      }
      console.log(`${teamSnapshot.contracts.length} players`);
    } catch (error) {
      failedTeams.push({ team: team.abbr, message: error.message });
      console.log(`FAILED (${error.message})`);
    }
    await sleep(600);
  }

  if (needsTeamDraftFallback) {
    draftPicks = dedupeDraftPicks(draftFromTeams);
    console.log(`  Using per-team draft picks: ${draftPicks.length}`);
  }
  if (failedTeams.length) {
    console.warn(
      `  Team failures: ${failedTeams
        .map(({ team, message }) => `${team}: ${message}`)
        .join("; ")}`
    );
  }
  if (leaguePayrollCheck) {
    const leaguePayrolls = await leaguePayrollCheck;
    console.log(
      leaguePayrolls.length === NBA_TEAMS.length
        ? "  Optional league cap cross-check covered all 30 teams"
        : `  Optional league cap cross-check ignored (${leaguePayrolls.length}/30 teams)`
    );
  }

  const uniqueContracts = dedupeContracts(contracts);
  const data = {
    updatedAt: new Date().toISOString(),
    source: "Spotrac (live scrape) + NBA official cap announcements",
    currentSeason: CURRENT_SEASON,
    capThresholds: CAP_THRESHOLDS,
    teamPayrolls,
    contracts: uniqueContracts,
    draftPicks,
  };

  const summary = await writeValidatedJsonAtomic(
    OUT,
    data,
    (candidate, { previous }) =>
      validateAppDataSnapshot(candidate, { previous })
  );

  console.log(`\nValidated and atomically wrote ${OUT}`);
  console.log(
    `Summary: ${summary.contracts} contracts, ${summary.draftPicks} draft picks, ${summary.payrolls} payrolls`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

import { TEAM_ABBRS, TEAM_ABBR_SET } from "./nba-teams.mjs";

export class SnapshotValidationError extends Error {
  constructor(label, issues) {
    super(`${label} validation failed:\n- ${issues.join("\n- ")}`);
    this.name = "SnapshotValidationError";
    this.issues = issues;
  }
}

function isObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function countByTeam(rows) {
  const counts = Object.fromEntries(TEAM_ABBRS.map((team) => [team, 0]));
  for (const row of rows) {
    if (TEAM_ABBR_SET.has(row?.team)) counts[row.team] += 1;
  }
  return counts;
}

function checkTimestamp(value, field, issues) {
  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    issues.push(`${field} must be a valid timestamp`);
  }
}

function checkUniqueTeamRows(rows, label, issues) {
  const seen = new Set();
  for (const row of rows) {
    const team = row?.team;
    if (!TEAM_ABBR_SET.has(team)) {
      issues.push(`${label} contains an unknown team: ${String(team)}`);
      continue;
    }
    if (seen.has(team)) issues.push(`${label} contains duplicate ${team} rows`);
    seen.add(team);
  }
  const missing = TEAM_ABBRS.filter((team) => !seen.has(team));
  if (missing.length) issues.push(`${label} is missing teams: ${missing.join(", ")}`);
}

function checkDrop(label, current, previous, maxDropRatio, issues) {
  if (!Number.isFinite(previous) || previous <= 0) return;
  const floor = Math.ceil(previous * (1 - maxDropRatio));
  if (current < floor) {
    const drop = Math.round((1 - current / previous) * 100);
    issues.push(
      `${label} dropped ${drop}% (${previous} -> ${current}); maximum allowed drop is ${Math.round(maxDropRatio * 100)}%`
    );
  }
}

function throwIfInvalid(label, issues) {
  if (issues.length) throw new SnapshotValidationError(label, issues);
}

function normalizedDraftDescription(value) {
  return typeof value === "string"
    ? value.trim().replace(/\s+/g, " ").toLowerCase()
    : "";
}

function checkDraftPicks(picks, minDraftPicks, issues) {
  if (picks.length < minDraftPicks) {
    issues.push(`draftPicks has ${picks.length} rows; expected at least ${minDraftPicks}`);
  }

  const ownerCounts = Object.fromEntries(TEAM_ABBRS.map((team) => [team, 0]));
  const draftIds = new Set();
  const semanticKeys = new Set();
  for (const pick of picks) {
    if (!TEAM_ABBR_SET.has(pick?.currentOwner)) {
      issues.push(`draft pick ${String(pick?.id)} has invalid currentOwner`);
    } else {
      ownerCounts[pick.currentOwner] += 1;
    }
    if (!TEAM_ABBR_SET.has(pick?.originalTeam)) {
      issues.push(`draft pick ${String(pick?.id)} has invalid originalTeam`);
    }
    if (!Number.isInteger(pick?.year) || ![1, 2].includes(pick?.round)) {
      issues.push(`draft pick ${String(pick?.id)} has an invalid year or round`);
    }

    const description = normalizedDraftDescription(pick?.description);
    if (!description) {
      issues.push(`draft pick ${String(pick?.id)} is missing a description`);
    }

    if (draftIds.has(pick?.id)) {
      issues.push(`duplicate draft pick id ${String(pick?.id)}`);
    }
    draftIds.add(pick?.id);

    const semanticKey = `${pick?.year}|${pick?.round}|${pick?.originalTeam}|${pick?.currentOwner}|${description}`;
    if (semanticKeys.has(semanticKey)) {
      issues.push(`duplicate draft pick right ${semanticKey}`);
    }
    semanticKeys.add(semanticKey);
  }

  const ownersMissingPicks = TEAM_ABBRS.filter((team) => ownerCounts[team] === 0);
  if (ownersMissingPicks.length) {
    issues.push(`draftPicks has no owned picks for: ${ownersMissingPicks.join(", ")}`);
  }
}

/** Validate a parsed league-wide draft feed before it suppresses team-page fallback. */
export function validateLeagueDraftPicks(picks, { minDraftPicks = 50 } = {}) {
  const issues = [];
  if (!Array.isArray(picks)) {
    throw new SnapshotValidationError("league draft picks", [
      "draftPicks must be an array",
    ]);
  }
  checkDraftPicks(picks, minDraftPicks, issues);
  throwIfInvalid("league draft picks", issues);
  return picks;
}

export function validateAppDataSnapshot(
  data,
  {
    previous = null,
    minContractsPerTeam = 8,
    minSalaryContractsPerTeam = 5,
    minPayrollPlayers = 8,
    minDraftPicks = 50,
    maxContractDropRatio = 0.35,
    maxTeamContractDropRatio = 0.4,
    maxDraftPickDropRatio = 0.5,
  } = {}
) {
  const issues = [];
  if (!isObject(data)) {
    throw new SnapshotValidationError("app-data", ["snapshot must be an object"]);
  }

  checkTimestamp(data.updatedAt, "updatedAt", issues);
  if (typeof data.source !== "string" || !data.source.trim()) {
    issues.push("source must be a non-empty string");
  }
  if (!/^20\d{2}-\d{2}$/.test(data.currentSeason || "")) {
    issues.push("currentSeason must use YYYY-YY format");
  }

  const payrolls = Array.isArray(data.teamPayrolls) ? data.teamPayrolls : [];
  const contracts = Array.isArray(data.contracts) ? data.contracts : [];
  const draftPicks = Array.isArray(data.draftPicks) ? data.draftPicks : [];
  const thresholds = Array.isArray(data.capThresholds) ? data.capThresholds : [];
  if (!Array.isArray(data.teamPayrolls)) issues.push("teamPayrolls must be an array");
  if (!Array.isArray(data.contracts)) issues.push("contracts must be an array");
  if (!Array.isArray(data.draftPicks)) issues.push("draftPicks must be an array");
  if (!Array.isArray(data.capThresholds)) issues.push("capThresholds must be an array");

  checkUniqueTeamRows(payrolls, "teamPayrolls", issues);
  for (const payroll of payrolls) {
    if (payroll?.season !== data.currentSeason) {
      issues.push(`${payroll?.team || "unknown"} payroll season does not match currentSeason`);
    }
    for (const field of ["totalCap", "activeCap"]) {
      if (!isFiniteNumber(payroll?.[field]) || payroll[field] <= 0) {
        issues.push(`${payroll?.team || "unknown"} payroll has invalid ${field}`);
      }
    }
    if (!isFiniteNumber(payroll?.deadCap) || payroll.deadCap < 0) {
      issues.push(`${payroll?.team || "unknown"} payroll has invalid deadCap`);
    }
    if (
      !Number.isInteger(payroll?.playersActive) ||
      payroll.playersActive < minPayrollPlayers
    ) {
      issues.push(
        `${payroll?.team || "unknown"} payroll has fewer than ${minPayrollPlayers} active players`
      );
    }
    if (!isFiniteNumber(payroll?.capSpace)) {
      issues.push(`${payroll?.team || "unknown"} payroll has invalid capSpace`);
    }
  }

  const contractsByTeam = countByTeam(contracts);
  const thinTeams = TEAM_ABBRS.filter(
    (team) => contractsByTeam[team] < minContractsPerTeam
  );
  if (thinTeams.length) {
    issues.push(
      `contracts has fewer than ${minContractsPerTeam} players for: ${thinTeams
        .map((team) => `${team} (${contractsByTeam[team]})`)
        .join(", ")}`
    );
  }

  const contractKeys = new Set();
  const salaryContractsByTeam = Object.fromEntries(
    TEAM_ABBRS.map((team) => [team, 0])
  );
  for (const contract of contracts) {
    if (!TEAM_ABBR_SET.has(contract?.team)) {
      issues.push(`contract contains an unknown team: ${String(contract?.team)}`);
    }
    if (typeof contract?.player !== "string" || !contract.player.trim()) {
      issues.push(`contract ${String(contract?.id)} is missing a player name`);
    }
    if (!Array.isArray(contract?.salaries)) {
      issues.push(`contract ${String(contract?.id)} salaries must be an array`);
    } else if (
      isFiniteNumber(contract.currentSalary) ||
      contract.salaries.some((salary) => isFiniteNumber(salary?.amount))
    ) {
      salaryContractsByTeam[contract.team] += 1;
    }
    const key = `${contract?.team}|${contract?.id}`;
    if (contractKeys.has(key)) issues.push(`duplicate contract key ${key}`);
    contractKeys.add(key);
  }
  const teamsMissingSalaryRows = TEAM_ABBRS.filter(
    (team) => salaryContractsByTeam[team] < minSalaryContractsPerTeam
  );
  if (teamsMissingSalaryRows.length) {
    issues.push(
      `contracts has fewer than ${minSalaryContractsPerTeam} players with salary data for: ${teamsMissingSalaryRows
        .map((team) => `${team} (${salaryContractsByTeam[team]})`)
        .join(", ")}`
    );
  }

  checkDraftPicks(draftPicks, minDraftPicks, issues);

  if (thresholds.length === 0) issues.push("capThresholds must not be empty");
  for (const cap of thresholds) {
    const lines = [
      cap?.salaryFloor,
      cap?.salaryCap,
      cap?.luxuryTax,
      cap?.firstApron,
      cap?.secondApron,
    ];
    if (lines.some((line) => !isFiniteNumber(line) || line <= 0)) {
      issues.push(`cap threshold ${String(cap?.season)} contains invalid values`);
    } else if (!(lines[0] < lines[1] && lines[1] < lines[2] && lines[2] < lines[3] && lines[3] < lines[4])) {
      issues.push(`cap threshold ${String(cap?.season)} lines are not strictly increasing`);
    }
  }
  if (!thresholds.some((cap) => cap?.season === data.currentSeason)) {
    issues.push(`capThresholds does not include currentSeason ${String(data.currentSeason)}`);
  }

  if (isObject(previous)) {
    const previousContracts = Array.isArray(previous.contracts) ? previous.contracts : [];
    const previousDraftPicks = Array.isArray(previous.draftPicks) ? previous.draftPicks : [];
    checkDrop(
      "league contract count",
      contracts.length,
      previousContracts.length,
      maxContractDropRatio,
      issues
    );
    checkDrop(
      "draft-pick count",
      draftPicks.length,
      previousDraftPicks.length,
      maxDraftPickDropRatio,
      issues
    );
    const previousByTeam = countByTeam(previousContracts);
    for (const team of TEAM_ABBRS) {
      checkDrop(
        `${team} contract count`,
        contractsByTeam[team],
        previousByTeam[team],
        maxTeamContractDropRatio,
        issues
      );
    }
  }

  throwIfInvalid("app-data", issues);
  return {
    contracts: contracts.length,
    draftPicks: draftPicks.length,
    payrolls: payrolls.length,
    contractsByTeam,
  };
}

export function validatePlayerStatsSnapshot(
  data,
  {
    previous = null,
    minPlayers = 300,
    minPlayersPerTeam = 5,
    minUsableStatRatio = 0.9,
    maxPlayerDropRatio = 0.25,
    maxTeamPlayerDropRatio = 0.7,
  } = {}
) {
  const issues = [];
  if (!isObject(data)) {
    throw new SnapshotValidationError("player-stats", ["snapshot must be an object"]);
  }

  checkTimestamp(data.updatedAt, "updatedAt", issues);
  if (typeof data.source !== "string" || !data.source.trim()) {
    issues.push("source must be a non-empty string");
  }
  if (typeof data.season !== "string" || !/^20\d{2}-\d{2}$/.test(data.season)) {
    issues.push("season must use YYYY-YY format");
  }
  const players = Array.isArray(data.players) ? data.players : [];
  if (!Array.isArray(data.players)) issues.push("players must be an array");
  if (players.length < minPlayers) {
    issues.push(`players has ${players.length} rows; expected at least ${minPlayers}`);
  }

  const playersByTeam = countByTeam(players);
  const thinTeams = TEAM_ABBRS.filter(
    (team) => playersByTeam[team] < minPlayersPerTeam
  );
  if (thinTeams.length) {
    issues.push(
      `players has fewer than ${minPlayersPerTeam} rows for: ${thinTeams
        .map((team) => `${team} (${playersByTeam[team]})`)
        .join(", ")}`
    );
  }

  const ids = new Set();
  let usableStatRows = 0;
  for (const player of players) {
    if (typeof player?.id !== "string" || !player.id) issues.push("player has an invalid id");
    if (ids.has(player?.id)) issues.push(`duplicate player id ${String(player?.id)}`);
    ids.add(player?.id);
    if (typeof player?.player !== "string" || !player.player.trim()) {
      issues.push(`player ${String(player?.id)} is missing a name`);
    }
    if (player?.team != null && !TEAM_ABBR_SET.has(player.team)) {
      issues.push(`player ${String(player?.id)} has unknown team ${String(player.team)}`);
    }
    if (!Number.isInteger(player?.gp) || player.gp < 0) {
      issues.push(`player ${String(player?.id)} has invalid games played`);
    }
    if (isFiniteNumber(player?.pts) && isFiniteNumber(player?.min)) {
      usableStatRows += 1;
    }
  }
  if (players.length > 0 && usableStatRows / players.length < minUsableStatRatio) {
    issues.push(
      `only ${usableStatRows}/${players.length} player rows contain usable points and minutes`
    );
  }

  if (isObject(previous)) {
    const previousPlayers = Array.isArray(previous.players) ? previous.players : [];
    checkDrop(
      "player count",
      players.length,
      previousPlayers.length,
      maxPlayerDropRatio,
      issues
    );
    const previousByTeam = countByTeam(previousPlayers);
    for (const team of TEAM_ABBRS) {
      checkDrop(
        `${team} player count`,
        playersByTeam[team],
        previousByTeam[team],
        maxTeamPlayerDropRatio,
        issues
      );
    }
  }

  throwIfInvalid("player-stats", issues);
  return { players: players.length, playersByTeam };
}

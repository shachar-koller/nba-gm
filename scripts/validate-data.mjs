#!/usr/bin/env node
/** Validate the committed snapshots without fetching or comparing prior data. */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readJsonIfExists } from "./lib/pipeline.mjs";
import {
  validateAppDataSnapshot,
  validatePlayerStatsSnapshot,
} from "./lib/validate-snapshots.mjs";
import { validatePlayerIdentityRegistry } from "./lib/player-profile-registry.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(SCRIPT_DIR, "..", "src", "data");

async function requireJson(name) {
  const filePath = join(DATA_DIR, name);
  const data = await readJsonIfExists(filePath);
  if (!data) throw new Error(`Missing snapshot: ${filePath}`);
  return data;
}

async function main() {
  const [appData, playerStats, playerProfileRegistry] = await Promise.all([
    requireJson("app-data.json"),
    requireJson("player-stats.json"),
    requireJson("player-profile-registry.json"),
  ]);
  const app = validateAppDataSnapshot(appData);
  const stats = validatePlayerStatsSnapshot(playerStats);
  const profiles = validatePlayerIdentityRegistry(playerProfileRegistry, {
    contracts: appData.contracts,
    players: playerStats.players,
  });
  console.log(
    `Validated snapshots: ${app.payrolls} payrolls, ${app.contracts} contracts, ${app.draftPicks} draft picks, ${stats.players} stat lines, ${profiles.aliases} player aliases`
  );
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

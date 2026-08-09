#!/usr/bin/env node
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  createPlayerProfileIndex,
  playerProfileSourceAliasForContract,
  playerProfileSourceAliasForStats,
  type PlayerIdentityRegistry,
} from "../src/lib/playerProfiles.ts";
import type {
  AppData,
  PlayerStatsData,
} from "../src/lib/types.ts";
import {
  validatePlayerIdentityRegistry,
} from "./lib/player-profile-registry.mjs";
import {
  readJsonIfExists,
  writeJsonAtomic,
} from "./lib/pipeline.mjs";

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(SCRIPT_DIR, "..", "src", "data");
const APP_DATA_PATH = join(DATA_DIR, "app-data.json");
const STATS_PATH = join(DATA_DIR, "player-stats.json");
const REGISTRY_PATH = join(DATA_DIR, "player-profile-registry.json");

async function requireJson<T>(filePath: string): Promise<T> {
  const value = await readJsonIfExists(filePath);
  if (!value) throw new Error(`Missing snapshot: ${filePath}`);
  return value as T;
}

async function main() {
  const [appData, statsData, previous] = await Promise.all([
    requireJson<AppData>(APP_DATA_PATH),
    requireJson<PlayerStatsData>(STATS_PATH),
    readJsonIfExists(REGISTRY_PATH),
  ]);
  const registry: PlayerIdentityRegistry =
    (previous as PlayerIdentityRegistry | null) ?? { version: 1, sources: {} };
  const index = createPlayerProfileIndex(
    appData.contracts,
    statsData.players,
    registry
  );
  const sources: Record<string, string> = { ...registry.sources };

  for (const profile of index.profiles) {
    if (profile.contract) {
      sources[playerProfileSourceAliasForContract(profile.contract)] = profile.id;
    }
    if (profile.stats) {
      sources[playerProfileSourceAliasForStats(profile.stats)] = profile.id;
    }
  }

  const next: PlayerIdentityRegistry = {
    version: 1,
    sources: Object.fromEntries(
      Object.entries(sources).sort(([left], [right]) =>
        left.localeCompare(right)
      )
    ),
  };
  const summary = validatePlayerIdentityRegistry(next, {
    contracts: appData.contracts,
    players: statsData.players,
  });
  await writeJsonAtomic(REGISTRY_PATH, next);
  console.log(
    `Updated player identity registry: ${summary.aliases} source aliases · ${summary.canonicalIds} canonical profiles`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

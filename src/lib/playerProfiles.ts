import type {
  PlayerContract,
  PlayerSeasonStats,
  TeamAbbr,
} from "./types";

export type PlayerProfileMatch =
  | "registry"
  | "team-name"
  | "name"
  | "unmatched";

export interface PlayerIdentityRegistry {
  version: 1;
  /** Stable source route (for example spotrac-123) to canonical profile ID. */
  sources: Record<string, string>;
}

export const EMPTY_PLAYER_IDENTITY_REGISTRY: PlayerIdentityRegistry = {
  version: 1,
  sources: {},
};

export interface PlayerProfile {
  /** Canonical, URL-safe player identifier. */
  id: string;
  name: string;
  team: TeamAbbr | null;
  position: string;
  age: number | null;
  contract: PlayerContract | null;
  stats: PlayerSeasonStats | null;
  sourceIds: {
    spotrac: string | null;
    espn: string | null;
  };
  /** How the two source rows were joined; unmatched means a single-source profile. */
  match: PlayerProfileMatch;
}

export interface PlayerProfileIndex {
  profiles: PlayerProfile[];
  /** Canonical IDs only. */
  byId: Map<string, PlayerProfile>;
  /** Canonical IDs plus stable Spotrac/ESPN source aliases. */
  byRouteId: Map<string, PlayerProfile>;
  bySpotracId: Map<string, PlayerProfile>;
  byEspnId: Map<string, PlayerProfile>;
}

const SPOTRAC_ALIAS_PREFIX = "spotrac-";
const ESPN_ALIAS_PREFIX = "espn-";
const APOSTROPHE_RE =
  /['\u0060\u00b4\u2018\u2019\u201b\u2032\u2035\u02bc\u02b9\u02bb]/g;

/** Verified aliases across the bundled Spotrac and ESPN snapshots. */
const VERIFIED_NAME_ALIASES: Readonly<Record<string, string>> = {
  "cameron christie": "cam christie",
  "herbert jones": "herb jones",
  "jimmy butler iii": "jimmy butler",
  "mohamed bamba": "mo bamba",
  "nicolas claxton": "nic claxton",
  "nahshon hyland": "bones hyland",
  "ronald holland ii": "ron holland ii",
  "sviatoslav mykhailiuk": "svi mykhailiuk",
  "tolu smith iii": "tolu smith",
  "trey jemison iii": "trey jemison",
};

/** Exact-name join key; intentionally shares the app search normalization rules. */
export function normalizePlayerProfileName(name: string): string {
  const normalized = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(APOSTROPHE_RE, "")
    // Initials must match with or without periods: C.J. === CJ.
    .replace(/\./g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
  return VERIFIED_NAME_ALIASES[normalized] ?? normalized;
}

function safeRouteToken(value: string): string {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sourceAliasId(prefix: string, id: string): string {
  const token = safeRouteToken(id);
  if (!token) throw new Error(`Invalid empty player source ID for ${prefix}`);
  return `${prefix}${token}`;
}

export function playerProfileSourceAliasForContract(
  contract: PlayerContract
): string {
  return sourceAliasId(SPOTRAC_ALIAS_PREFIX, contract.id);
}

export function playerProfileSourceAliasForStats(
  stats: PlayerSeasonStats
): string {
  return sourceAliasId(ESPN_ALIAS_PREFIX, stats.id);
}

export function playerProfileIdForName(name: string): string {
  const normalized = normalizePlayerProfileName(name);
  const id = normalized.replace(/\s+/g, "-");
  if (!id) throw new Error("Cannot create a player profile ID without a name");
  return id;
}

export function playerProfileIdForContract(
  contract: PlayerContract,
  registry: PlayerIdentityRegistry = EMPTY_PLAYER_IDENTITY_REGISTRY
): string {
  return (
    registry.sources[playerProfileSourceAliasForContract(contract)] ??
    playerProfileIdForName(contract.player)
  );
}

export function playerProfileIdForStats(
  stats: PlayerSeasonStats,
  registry: PlayerIdentityRegistry = EMPTY_PLAYER_IDENTITY_REGISTRY
): string {
  return (
    registry.sources[playerProfileSourceAliasForStats(stats)] ??
    playerProfileIdForName(stats.player)
  );
}

export function playerProfileHref(id: string): string {
  return `/players/${encodeURIComponent(id)}`;
}

export function playerProfileHrefForContract(
  contract: PlayerContract,
  registry: PlayerIdentityRegistry = EMPTY_PLAYER_IDENTITY_REGISTRY
): string {
  return playerProfileHref(playerProfileIdForContract(contract, registry));
}

function teamNameKey(
  name: string,
  team: TeamAbbr | null | undefined
): string | null {
  const normalized = normalizePlayerProfileName(name);
  if (!normalized || !team) return null;
  return `${team}|${normalized}`;
}

function addToIndex<T>(map: Map<string, T[]>, key: string, value: T): void {
  const rows = map.get(key);
  if (rows) rows.push(value);
  else map.set(key, [value]);
}

function profileFromContract(contract: PlayerContract): PlayerProfile {
  return {
    id: playerProfileIdForContract(contract),
    name: contract.player,
    team: contract.team,
    position: contract.position,
    age: contract.age,
    contract,
    stats: null,
    sourceIds: { spotrac: contract.id, espn: null },
    match: "unmatched",
  };
}

function profileFromStats(stats: PlayerSeasonStats): PlayerProfile {
  return {
    id: playerProfileIdForStats(stats),
    name: stats.player,
    team: stats.team,
    position: stats.position,
    age: stats.age,
    contract: null,
    stats,
    sourceIds: { spotrac: null, espn: stats.id },
    match: "unmatched",
  };
}

/**
 * Build one canonical profile per player across the Spotrac and ESPN snapshots.
 *
 * Matching is deliberately conservative:
 * 1. Reuse a persisted cross-source identity when one exists.
 * 2. Prefer a unique normalized-name + team match.
 * 3. Fall back to normalized name alone only when that name is unique in both
 *    sources. This covers trades between the stats season and contract season.
 * 4. Never fuzzy-match or collapse ambiguous names.
 *
 * New canonical IDs start from the normalized player name, then the generated
 * registry preserves that choice across refreshes. Source-prefixed IDs remain
 * valid aliases.
 */
export function createPlayerProfileIndex(
  contracts: PlayerContract[],
  statsRows: PlayerSeasonStats[],
  registry: PlayerIdentityRegistry = EMPTY_PLAYER_IDENTITY_REGISTRY
): PlayerProfileIndex {
  const contractsByName = new Map<string, PlayerContract[]>();
  const contractsByTeamName = new Map<string, PlayerContract[]>();
  const statsByName = new Map<string, PlayerSeasonStats[]>();
  const statsByTeamName = new Map<string, PlayerSeasonStats[]>();
  const contractsByRegistryId = new Map<string, PlayerContract[]>();

  for (const contract of contracts) {
    const name = normalizePlayerProfileName(contract.player);
    if (!name) continue;
    addToIndex(contractsByName, name, contract);
    const key = teamNameKey(contract.player, contract.team);
    if (key) addToIndex(contractsByTeamName, key, contract);
    const registryId =
      registry.sources[playerProfileSourceAliasForContract(contract)];
    if (registryId) addToIndex(contractsByRegistryId, registryId, contract);
  }

  for (const stats of statsRows) {
    const name = normalizePlayerProfileName(stats.player);
    if (name) addToIndex(statsByName, name, stats);
    const key = teamNameKey(stats.player, stats.team);
    if (key) addToIndex(statsByTeamName, key, stats);
  }

  const profiles = contracts.map(profileFromContract);
  const profileByContract = new Map<PlayerContract, PlayerProfile>();
  contracts.forEach((contract, index) => {
    profileByContract.set(contract, profiles[index]);
  });

  const matchedContracts = new Set<PlayerContract>();

  for (const stats of statsRows) {
    const normalizedName = normalizePlayerProfileName(stats.player);
    let contract: PlayerContract | null = null;
    let match: PlayerProfileMatch = "unmatched";

    const statsRegistryId =
      registry.sources[playerProfileSourceAliasForStats(stats)];
    const registryCandidates = statsRegistryId
      ? (contractsByRegistryId.get(statsRegistryId) ?? []).filter(
          (candidate) => !matchedContracts.has(candidate)
        )
      : [];

    if (registryCandidates.length === 1) {
      contract = registryCandidates[0];
      match = "registry";
    }

    const exactKey = teamNameKey(stats.player, stats.team);
    const exactCandidates = exactKey
      ? (contractsByTeamName.get(exactKey) ?? []).filter(
          (candidate) => !matchedContracts.has(candidate)
        )
      : [];

    if (
      !contract &&
      exactCandidates.length === 1 &&
      exactKey &&
      (statsByTeamName.get(exactKey)?.length ?? 0) === 1
    ) {
      contract = exactCandidates[0];
      match = "team-name";
    } else if (!contract && normalizedName) {
      const nameCandidates = (contractsByName.get(normalizedName) ?? []).filter(
        (candidate) => !matchedContracts.has(candidate)
      );
      const sameNameStats = statsByName.get(normalizedName) ?? [];
      if (nameCandidates.length === 1 && sameNameStats.length === 1) {
        contract = nameCandidates[0];
        match = "name";
      }
    }

    if (!contract) {
      profiles.push(profileFromStats(stats));
      continue;
    }

    matchedContracts.add(contract);
    const profile = profileByContract.get(contract)!;
    profile.stats = stats;
    profile.sourceIds.espn = stats.id;
    profile.match = match;
    profile.position ||= stats.position;
    profile.age ??= stats.age;
  }

  // Restore canonical IDs already assigned to either source. This keeps URLs
  // stable across name changes, source churn, and later namesake collisions.
  const registeredProfiles = new Set<PlayerProfile>();
  for (const profile of profiles) {
    const registeredIds = new Set<string>();
    if (profile.sourceIds.spotrac) {
      const id =
        registry.sources[
          sourceAliasId(SPOTRAC_ALIAS_PREFIX, profile.sourceIds.spotrac)
        ];
      if (id) registeredIds.add(id);
    }
    if (profile.sourceIds.espn) {
      const id =
        registry.sources[
          sourceAliasId(ESPN_ALIAS_PREFIX, profile.sourceIds.espn)
        ];
      if (id) registeredIds.add(id);
    }
    if (registeredIds.size > 1) {
      throw new Error(
        `Conflicting canonical player IDs for ${profile.name}: ${[...registeredIds].join(", ")}`
      );
    }
    const [registeredId] = registeredIds;
    if (registeredId) {
      if (safeRouteToken(registeredId) !== registeredId) {
        throw new Error(`Invalid canonical player profile ID: ${registeredId}`);
      }
      profile.id = registeredId;
      registeredProfiles.add(profile);
    } else {
      profile.id = playerProfileIdForName(profile.name);
    }
  }

  const claimedIds = new Map<string, PlayerProfile>();
  for (const profile of registeredProfiles) {
    const existing = claimedIds.get(profile.id);
    if (existing && existing !== profile) {
      throw new Error(
        `Registry maps multiple current players to canonical ID: ${profile.id}`
      );
    }
    claimedIds.set(profile.id, profile);
  }

  const unresolvedByBaseId = new Map<string, PlayerProfile[]>();
  for (const profile of profiles) {
    if (!registeredProfiles.has(profile)) {
      addToIndex(unresolvedByBaseId, profile.id, profile);
    }
  }
  for (const [baseId, sameNameProfiles] of unresolvedByBaseId) {
    const baseAvailable = sameNameProfiles.length === 1 && !claimedIds.has(baseId);
    for (const profile of sameNameProfiles) {
      if (baseAvailable) {
        profile.id = baseId;
      } else {
        const suffix = profile.sourceIds.spotrac
          ? sourceAliasId(SPOTRAC_ALIAS_PREFIX, profile.sourceIds.spotrac)
          : sourceAliasId(ESPN_ALIAS_PREFIX, profile.sourceIds.espn!);
        profile.id = `${baseId}-${suffix}`;
      }
      if (claimedIds.has(profile.id)) {
        throw new Error(`Duplicate canonical player profile ID: ${profile.id}`);
      }
      claimedIds.set(profile.id, profile);
    }
  }

  profiles.sort(
    (a, b) =>
      a.name.localeCompare(b.name) ||
      (a.team ?? "").localeCompare(b.team ?? "") ||
      a.id.localeCompare(b.id)
  );

  const byId = new Map<string, PlayerProfile>();
  const byRouteId = new Map<string, PlayerProfile>();
  const bySpotracId = new Map<string, PlayerProfile>();
  const byEspnId = new Map<string, PlayerProfile>();
  const registerRoute = (routeId: string, profile: PlayerProfile) => {
    const existing = byRouteId.get(routeId);
    if (existing && existing !== profile) {
      throw new Error(`Duplicate player profile route ID: ${routeId}`);
    }
    byRouteId.set(routeId, profile);
  };
  for (const profile of profiles) {
    if (byId.has(profile.id)) {
      throw new Error(`Duplicate canonical player profile ID: ${profile.id}`);
    }
    byId.set(profile.id, profile);
    registerRoute(profile.id, profile);
    if (profile.sourceIds.spotrac) {
      bySpotracId.set(profile.sourceIds.spotrac, profile);
      registerRoute(
        sourceAliasId(SPOTRAC_ALIAS_PREFIX, profile.sourceIds.spotrac),
        profile
      );
    }
    if (profile.sourceIds.espn) {
      byEspnId.set(profile.sourceIds.espn, profile);
      registerRoute(
        sourceAliasId(ESPN_ALIAS_PREFIX, profile.sourceIds.espn),
        profile
      );
    }
  }

  // Keep historical source URLs working whenever that player still has a
  // current profile, even if the corresponding source row disappeared.
  for (const [routeId, canonicalId] of Object.entries(registry.sources)) {
    if (
      !routeId.startsWith(SPOTRAC_ALIAS_PREFIX) &&
      !routeId.startsWith(ESPN_ALIAS_PREFIX)
    ) {
      throw new Error(`Invalid player source alias: ${routeId}`);
    }
    const profile = byId.get(canonicalId);
    if (profile) registerRoute(routeId, profile);
  }

  return { profiles, byId, byRouteId, bySpotracId, byEspnId };
}

export function playerProfileHrefForStats(
  stats: PlayerSeasonStats,
  index: Pick<PlayerProfileIndex, "byEspnId">
): string {
  const canonicalId = index.byEspnId.get(stats.id)?.id;
  return playerProfileHref(canonicalId ?? playerProfileIdForStats(stats));
}

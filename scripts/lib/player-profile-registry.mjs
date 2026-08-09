function safeToken(value) {
  return String(value)
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function playerSourceAlias(source, id) {
  if (source !== "spotrac" && source !== "espn") {
    throw new Error(`Unknown player identity source: ${source}`);
  }
  const token = safeToken(id);
  if (!token) throw new Error(`Empty ${source} player source ID`);
  return `${source}-${token}`;
}

/**
 * @param {unknown} registry
 * @param {{ contracts?: Array<{ id?: unknown }>, players?: Array<{ id?: unknown }> }} [rows]
 */
export function validatePlayerIdentityRegistry(
  registry,
  { contracts = [], players = [] } = {}
) {
  const issues = [];
  if (
    registry == null ||
    typeof registry !== "object" ||
    Array.isArray(registry)
  ) {
    throw new Error("player profile registry must be an object");
  }
  if (registry.version !== 1) issues.push("version must be 1");
  if (
    registry.sources == null ||
    typeof registry.sources !== "object" ||
    Array.isArray(registry.sources)
  ) {
    issues.push("sources must be an object");
  }

  const sources = registry.sources ?? {};
  for (const [alias, canonicalId] of Object.entries(sources)) {
    if (!/^(?:spotrac|espn)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(alias)) {
      issues.push(`invalid source alias ${alias}`);
    }
    if (
      typeof canonicalId !== "string" ||
      !canonicalId ||
      safeToken(canonicalId) !== canonicalId
    ) {
      issues.push(`invalid canonical ID for ${alias}`);
    }
  }

  for (const contract of contracts) {
    const alias = playerSourceAlias("spotrac", contract?.id);
    if (!sources[alias]) issues.push(`missing current source alias ${alias}`);
  }
  for (const player of players) {
    const alias = playerSourceAlias("espn", player?.id);
    if (!sources[alias]) issues.push(`missing current source alias ${alias}`);
  }

  if (issues.length) {
    throw new Error(`player profile registry validation failed:\n- ${issues.join("\n- ")}`);
  }
  return {
    aliases: Object.keys(sources).length,
    canonicalIds: new Set(Object.values(sources)).size,
  };
}

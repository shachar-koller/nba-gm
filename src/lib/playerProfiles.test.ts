import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { PlayerContract, PlayerSeasonStats, TeamAbbr } from "./types.ts";
import {
  createPlayerProfileIndex,
  normalizePlayerProfileName,
  playerProfileHref,
  playerProfileHrefForStats,
  playerProfileIdForContract,
  playerProfileIdForStats,
  type PlayerIdentityRegistry,
} from "./playerProfiles.ts";

function contract(
  id: string,
  player: string,
  team: TeamAbbr,
  partial: Partial<PlayerContract> = {}
): PlayerContract {
  return {
    id,
    player,
    team,
    position: "G",
    age: 27,
    salaries: [],
    guaranteed: null,
    freeAgencyYear: null,
    freeAgencyType: null,
    contractYears: 0,
    currentSalary: null,
    notes: [],
    ...partial,
  };
}

function stats(
  id: string,
  player: string,
  team: TeamAbbr | null,
  partial: Partial<PlayerSeasonStats> = {}
): PlayerSeasonStats {
  return {
    id,
    player,
    team,
    position: "PG",
    age: 26,
    gp: 50,
    min: null,
    pts: null,
    reb: null,
    ast: null,
    stl: null,
    blk: null,
    tov: null,
    pf: null,
    fgm: null,
    fga: null,
    fgPct: null,
    threePm: null,
    threePa: null,
    threePct: null,
    ftm: null,
    fta: null,
    ftPct: null,
    dd2: 0,
    td3: 0,
    ptsTotal: null,
    rebTotal: null,
    astTotal: null,
    stlTotal: null,
    blkTotal: null,
    tovTotal: null,
    minTotal: null,
    fgmTotal: null,
    fgaTotal: null,
    threePmTotal: null,
    threePaTotal: null,
    ftmTotal: null,
    ftaTotal: null,
    tsPct: null,
    efgPct: null,
    threePar: null,
    ftr: null,
    astTo: null,
    tovPct: null,
    eff: null,
    stocks: null,
    ...partial,
  };
}

describe("player profile IDs", () => {
  it("uses stable name-based IDs and encoded hrefs", () => {
    const c = contract("42", "Test Player", "BOS");
    const s = stats("99", "Stats Player", "BOS");
    assert.equal(playerProfileIdForContract(c), "test-player");
    assert.equal(playerProfileIdForStats(s), "stats-player");
    assert.equal(playerProfileHref("spotrac-a/b"), "/players/spotrac-a%2Fb");
  });

  it("normalizes dotted initials and verified source-name aliases", () => {
    assert.equal(
      normalizePlayerProfileName("C.J. McCollum"),
      normalizePlayerProfileName("CJ McCollum")
    );
    assert.equal(
      normalizePlayerProfileName("Herbert Jones"),
      normalizePlayerProfileName("Herb Jones")
    );
    assert.equal(
      normalizePlayerProfileName("Jimmy Butler III"),
      normalizePlayerProfileName("Jimmy Butler")
    );
  });
});

describe("createPlayerProfileIndex", () => {
  it("merges accent and punctuation variants on normalized name + team", () => {
    const c = contract("1", "Dennis Schröder", "CLE");
    const s = stats("101", "Dennis Schroder", "CLE");
    const index = createPlayerProfileIndex([c], [s]);

    assert.equal(index.profiles.length, 1);
    assert.equal(index.profiles[0].id, "dennis-schroder");
    assert.equal(index.profiles[0].stats, s);
    assert.equal(index.profiles[0].match, "team-name");
    assert.equal(playerProfileHrefForStats(s, index), "/players/dennis-schroder");
    assert.equal(index.byRouteId.get("spotrac-1"), index.profiles[0]);
    assert.equal(index.byRouteId.get("espn-101"), index.profiles[0]);
  });

  it("falls back to a unique normalized name when the team changed", () => {
    const c = contract("2", "Alex Example", "NYK");
    const s = stats("102", "Alex Example", "BOS");
    const index = createPlayerProfileIndex([c], [s]);

    assert.equal(index.profiles.length, 1);
    assert.equal(index.profiles[0].team, "NYK");
    assert.equal(index.profiles[0].stats?.team, "BOS");
    assert.equal(index.profiles[0].match, "name");
  });

  it("does not guess when a normalized name is ambiguous", () => {
    const contracts = [
      contract("3", "Jordan Smith", "BOS"),
      contract("4", "Jordan Smith", "NYK"),
    ];
    const row = stats("103", "Jordan Smith", null);
    const index = createPlayerProfileIndex(contracts, [row]);

    assert.equal(index.profiles.length, 3);
    assert.match(index.byEspnId.get("103")?.id ?? "", /^jordan-smith-espn-/);
    assert.equal(index.bySpotracId.get("3")?.stats, null);
    assert.equal(index.bySpotracId.get("4")?.stats, null);
  });

  it("uses an exact team match even when the name exists on multiple teams", () => {
    const boston = contract("5", "Taylor Lee", "BOS");
    const newYork = contract("6", "Taylor Lee", "NYK");
    const row = stats("104", "Taylor Lee", "NYK");
    const index = createPlayerProfileIndex([boston, newYork], [row]);

    assert.match(index.byEspnId.get("104")?.id ?? "", /^taylor-lee-spotrac-/);
    assert.equal(index.bySpotracId.get("5")?.stats, null);
  });

  it("does not arbitrarily merge duplicate stats rows on the same team", () => {
    const c = contract("9", "Duplicate Name", "BOS");
    const first = stats("107", "Duplicate Name", "BOS");
    const second = stats("108", "Duplicate Name", "BOS");
    const index = createPlayerProfileIndex([c], [first, second]);

    assert.equal(index.bySpotracId.get("9")?.stats, null);
    assert.match(index.byEspnId.get("107")?.id ?? "", /^duplicate-name-espn-/);
    assert.match(index.byEspnId.get("108")?.id ?? "", /^duplicate-name-espn-/);
  });

  it("keeps single-source rows as distinct Spotrac and ESPN profiles", () => {
    const c = contract("7", "Contract Only", "MIA");
    const s = stats("105", "Stats Only", "LAL");
    const index = createPlayerProfileIndex([c], [s]);

    assert.deepEqual(
      index.profiles.map((profile) => profile.id).sort(),
      ["contract-only", "stats-only"]
    );
    assert.equal(index.byId.get("contract-only")?.contract, c);
    assert.equal(index.byId.get("stats-only")?.stats, s);
  });

  it("prefers current contract identity fields and fills missing values from stats", () => {
    const c = contract("8", "Current Name", "DAL", {
      position: "",
      age: null,
    });
    const s = stats("106", "Current Name", "DAL", {
      position: "SF",
      age: 24,
    });
    const profile = createPlayerProfileIndex([c], [s]).profiles[0];

    assert.equal(profile.name, "Current Name");
    assert.equal(profile.team, "DAL");
    assert.equal(profile.position, "SF");
    assert.equal(profile.age, 24);
  });

  it("keeps the canonical URL when either source appears later", () => {
    const c = contract("88", "Stable Player", "MIA");
    const s = stats("188", "Stable Player", "MIA");

    const contractOnly = createPlayerProfileIndex([c], []);
    const statsOnly = createPlayerProfileIndex([], [s]);
    const merged = createPlayerProfileIndex([c], [s]);

    assert.equal(contractOnly.profiles[0].id, "stable-player");
    assert.equal(statsOnly.profiles[0].id, "stable-player");
    assert.equal(merged.profiles[0].id, "stable-player");
    assert.equal(merged.byRouteId.get("spotrac-88"), merged.profiles[0]);
    assert.equal(merged.byRouteId.get("espn-188"), merged.profiles[0]);
  });

  it("merges dotted initials and a verified nickname alias", () => {
    const cj = createPlayerProfileIndex(
      [contract("11", "C.J. McCollum", "WAS")],
      [stats("111", "CJ McCollum", "WAS")]
    );
    const herb = createPlayerProfileIndex(
      [contract("12", "Herb Jones", "NOP")],
      [stats("112", "Herbert Jones", "NOP")]
    );

    assert.equal(cj.profiles.length, 1);
    assert.equal(cj.profiles[0].id, "cj-mccollum");
    assert.equal(herb.profiles.length, 1);
    assert.equal(herb.profiles[0].id, "herb-jones");
  });

  it("uses the registry to survive a name change and merge both sources", () => {
    const c = contract("21", "Current Name", "MIA");
    const s = stats("121", "Former Name", "BOS");
    const registry: PlayerIdentityRegistry = {
      version: 1,
      sources: {
        "spotrac-21": "former-name",
        "espn-121": "former-name",
      },
    };
    const index = createPlayerProfileIndex([c], [s], registry);

    assert.equal(index.profiles.length, 1);
    assert.equal(index.profiles[0].id, "former-name");
    assert.equal(index.profiles[0].match, "registry");
    assert.equal(index.byRouteId.get("spotrac-21"), index.profiles[0]);
    assert.equal(index.byRouteId.get("espn-121"), index.profiles[0]);
  });

  it("keeps an existing canonical slug when a namesake appears later", () => {
    const original = contract("31", "Jordan Smith", "BOS");
    const namesake = contract("32", "Jordan Smith", "NYK");
    const registry: PlayerIdentityRegistry = {
      version: 1,
      sources: { "spotrac-31": "jordan-smith" },
    };
    const index = createPlayerProfileIndex([original, namesake], [], registry);

    assert.equal(index.bySpotracId.get("31")?.id, "jordan-smith");
    assert.equal(
      index.bySpotracId.get("32")?.id,
      "jordan-smith-spotrac-32"
    );
  });

  it("retains a historical source alias after that source row disappears", () => {
    const s = stats("141", "Persistent Player", "LAL");
    const registry: PlayerIdentityRegistry = {
      version: 1,
      sources: {
        "espn-141": "persistent-player",
        "spotrac-legacy": "persistent-player",
      },
    };
    const index = createPlayerProfileIndex([], [s], registry);

    assert.equal(index.byRouteId.get("spotrac-legacy"), index.profiles[0]);
    assert.equal(index.byRouteId.get("espn-141"), index.profiles[0]);
  });
});

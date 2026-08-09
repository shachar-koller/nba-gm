import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { validateEspnStatsPage } from "./espn-stats.mjs";
import { TEAM_ABBRS } from "./nba-teams.mjs";
import {
  fetchJsonWithRetry,
  fetchTextWithRetry,
  fetchWithRetry,
  writeValidatedJsonAtomic,
} from "./pipeline.mjs";
import {
  SnapshotValidationError,
  validateAppDataSnapshot,
  validateLeagueDraftPicks,
  validatePlayerStatsSnapshot,
} from "./validate-snapshots.mjs";

function makeAppData(contractsPerTeam = 10) {
  const contracts = TEAM_ABBRS.flatMap((team) =>
    Array.from({ length: contractsPerTeam }, (_, index) => ({
      id: `${team}-${index}`,
      player: `${team} Player ${index}`,
      team,
      currentSalary: 1_000_000,
      salaries: [{ season: "2026-27", amount: 1_000_000 }],
    }))
  );
  const draftPicks = TEAM_ABBRS.flatMap((team, index) =>
    [1, 2].map((round) => ({
      id: `${team}-${round}`,
      year: 2028 + (index % 3),
      round,
      originalTeam: team,
      currentOwner: team,
      description: `${team} own ${2028 + (index % 3)} Round ${round}`,
    }))
  );
  return {
    updatedAt: "2026-08-07T12:00:00.000Z",
    source: "fixture",
    currentSeason: "2026-27",
    capThresholds: [
      {
        season: "2026-27",
        salaryFloor: 140,
        salaryCap: 150,
        luxuryTax: 170,
        firstApron: 180,
        secondApron: 190,
      },
    ],
    teamPayrolls: TEAM_ABBRS.map((team) => ({
      team,
      season: "2026-27",
      totalCap: 150,
      activeCap: 140,
      deadCap: 10,
      capSpace: 0,
      playersActive: 15,
    })),
    contracts,
    draftPicks,
  };
}

function makeStats(playersPerTeam = 10) {
  return {
    updatedAt: "2026-08-07T12:00:00.000Z",
    source: "fixture",
    season: "2025-26",
    seasonType: "Regular Season",
    players: TEAM_ABBRS.flatMap((team) =>
      Array.from({ length: playersPerTeam }, (_, index) => ({
        id: `${team}-${index}`,
        player: `${team} Player ${index}`,
        team,
        gp: 20,
        min: 12.5,
        pts: 5.5,
      }))
    ),
  };
}

describe("snapshot validators", () => {
  it("accepts complete league snapshots", () => {
    const app = validateAppDataSnapshot(makeAppData());
    const stats = validatePlayerStatsSnapshot(makeStats());
    assert.equal(app.payrolls, 30);
    assert.equal(app.contracts, 300);
    assert.equal(stats.players, 300);
  });

  it("rejects a zero-contract team even when the league total is large", () => {
    const data = makeAppData();
    data.contracts = data.contracts.filter((contract) => contract.team !== "LAL");
    assert.throws(
      () => validateAppDataSnapshot(data),
      (error) =>
        error instanceof SnapshotValidationError &&
        error.message.includes("LAL (0)")
    );
  });

  it("rejects a large per-team contract drop against the last-good snapshot", () => {
    const previous = makeAppData(20);
    const next = makeAppData(20);
    next.contracts = next.contracts.filter(
      (contract) => contract.team !== "BOS" || Number(contract.id.split("-").at(-1)) < 10
    );
    assert.throws(
      () =>
        validateAppDataSnapshot(next, {
          previous,
          minContractsPerTeam: 1,
        }),
      (error) =>
        error instanceof SnapshotValidationError &&
        error.message.includes("BOS contract count dropped 50%")
    );
  });

  it("rejects duplicate draft rights even when their generated ids differ", () => {
    const data = makeAppData();
    data.draftPicks.push({
      ...data.draftPicks[0],
      id: "different-generated-id",
    });

    assert.throws(
      () => validateAppDataSnapshot(data),
      (error) =>
        error instanceof SnapshotValidationError &&
        error.message.includes("duplicate draft pick right")
    );
  });

  it("rejects a large league draft feed that omits most current owners", () => {
    const picks = Array.from({ length: 60 }, (_, index) => ({
      id: `ATL-${index}`,
      year: 2027 + Math.floor(index / 2),
      round: (index % 2) + 1,
      originalTeam: "ATL",
      currentOwner: "ATL",
      description: `ATL right ${index}`,
    }));

    assert.throws(
      () => validateLeagueDraftPicks(picks),
      (error) =>
        error instanceof SnapshotValidationError &&
        error.message.includes("draftPicks has no owned picks for: BOS")
    );
  });

  it("rejects a stats snapshot that loses an entire team", () => {
    const data = makeStats();
    data.players = data.players.filter((player) => player.team !== "LAL");
    assert.throws(
      () => validatePlayerStatsSnapshot(data),
      (error) =>
        error instanceof SnapshotValidationError &&
        error.message.includes("LAL (0)")
    );
  });
});

describe("retry and atomic-write helpers", () => {
  it("retries transient responses but not permanent failures", async () => {
    let calls = 0;
    const response = await fetchWithRetry("https://example.test/transient", {}, {
      attempts: 3,
      baseDelayMs: 0,
      jitterRatio: 0,
      sleepImpl: async () => {},
      fetchImpl: async () => {
        calls += 1;
        return new Response("", { status: calls < 3 ? 503 : 200 });
      },
    });
    assert.equal(response.status, 200);
    assert.equal(calls, 3);

    calls = 0;
    await assert.rejects(
      fetchWithRetry("https://example.test/permanent", {}, {
        attempts: 3,
        baseDelayMs: 0,
        jitterRatio: 0,
        sleepImpl: async () => {},
        fetchImpl: async () => {
          calls += 1;
          return new Response("", { status: 404 });
        },
      }),
      /HTTP 404/
    );
    assert.equal(calls, 1);
  });

  it("honors Retry-After independently of the exponential-backoff cap", async () => {
    let calls = 0;
    const waits = [];
    const response = await fetchWithRetry("https://example.test/rate-limit", {}, {
      attempts: 2,
      baseDelayMs: 10,
      maxDelayMs: 100,
      jitterRatio: 0,
      sleepImpl: async (waitMs) => waits.push(waitMs),
      fetchImpl: async () => {
        calls += 1;
        return calls === 1
          ? new Response("", {
              status: 429,
              headers: { "Retry-After": "12" },
            })
          : new Response("", { status: 200 });
      },
    });

    assert.equal(response.status, 200);
    assert.deepEqual(waits, [12_000]);
  });

  it("stops instead of retrying before an excessive Retry-After", async () => {
    let calls = 0;
    await assert.rejects(
      fetchWithRetry("https://example.test/long-rate-limit", {}, {
        attempts: 3,
        maxRetryAfterMs: 30_000,
        sleepImpl: async () => assert.fail("must not sleep"),
        fetchImpl: async () => {
          calls += 1;
          return new Response("", {
            status: 429,
            headers: { "Retry-After": "60" },
          });
        },
      }),
      /exceeding the 30000ms safety cap/
    );
    assert.equal(calls, 1);
  });

  it("retries HTTP 200 responses when text parsing or semantic checks fail", async () => {
    let calls = 0;
    const players = await fetchTextWithRetry("https://example.test/team", {}, {
      attempts: 2,
      baseDelayMs: 0,
      jitterRatio: 0,
      sleepImpl: async () => {},
      fetchImpl: async () => {
        calls += 1;
        return new Response(
          calls === 1
            ? "<html><title>Temporary challenge</title></html>"
            : '<table id="roster"><tr><td>Player</td></tr></table>',
          { status: 200 }
        );
      },
      transform: (html) => {
        if (!html.includes('id="roster"')) {
          throw new Error("roster parser found no table");
        }
        return ["Player"];
      },
    });

    assert.deepEqual(players, ["Player"]);
    assert.equal(calls, 2);
  });

  it("retries ESPN HTTP 200 responses with truncated JSON or an incomplete shape", async () => {
    let calls = 0;
    const validPage = {
      pagination: { pages: 1 },
      categories: [{ name: "general", names: ["gamesPlayed"] }],
      athletes: [
        {
          athlete: { id: "1", displayName: "Fixture Player" },
          categories: [{ name: "general", values: [20] }],
        },
      ],
    };

    const page = await fetchJsonWithRetry("https://example.test/espn", {}, {
      attempts: 3,
      baseDelayMs: 0,
      jitterRatio: 0,
      sleepImpl: async () => {},
      fetchImpl: async () => {
        calls += 1;
        if (calls === 1) return new Response('{"pagination":', { status: 200 });
        const payload = calls === 2 ? { pagination: { pages: 1 } } : validPage;
        return new Response(JSON.stringify(payload), { status: 200 });
      },
      transform: (payload) => validateEspnStatsPage(payload, { page: 1 }),
    });

    assert.equal(page.athletes[0].athlete.displayName, "Fixture Player");
    assert.equal(calls, 3);
  });

  it("keeps the last-good JSON when validation rejects a candidate", async () => {
    const directory = await mkdtemp(join(tmpdir(), "nba-fo-pipeline-"));
    const output = join(directory, "snapshot.json");
    try {
      await writeFile(output, '{"version":1}\n');
      await assert.rejects(
        writeValidatedJsonAtomic(output, { version: 2 }, () => {
          throw new Error("candidate rejected");
        }),
        /candidate rejected/
      );
      assert.deepEqual(JSON.parse(await readFile(output, "utf8")), { version: 1 });

      await writeValidatedJsonAtomic(output, { version: 3 }, () => ({ ok: true }));
      assert.deepEqual(JSON.parse(await readFile(output, "utf8")), { version: 3 });
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

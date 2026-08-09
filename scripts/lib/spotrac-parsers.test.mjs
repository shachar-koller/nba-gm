import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import {
  parseLeagueDraftPicks,
  parseTeamContracts,
  parseTeamDraftPicks,
  parseTeamPayrollFromYearly,
  parseTeamPayrolls,
} from "./spotrac-parsers.mjs";

async function fixture(name) {
  return readFile(new URL(`../fixtures/${name}`, import.meta.url), "utf8");
}

describe("Spotrac fixture parsers", () => {
  it("parses league payroll rows and normalizes team aliases", async () => {
    const payrolls = parseTeamPayrolls(await fixture("spotrac-cap-table.html"));
    assert.deepEqual(
      payrolls.map((row) => row.team),
      ["LAL", "BKN"]
    );
    assert.deepEqual(payrolls[0], {
      team: "LAL",
      season: "2026-27",
      playersActive: 15,
      avgAge: 27.4,
      totalCap: 210_000_000,
      capSpace: -45_039_000,
      activeCap: 195_000_000,
      deadCap: 5_000_000,
    });
  });

  it("ignores Spotrac's reduced three-column league cap table", async () => {
    const payrolls = parseTeamPayrolls(await fixture("spotrac-cap-mobile.html"));
    assert.deepEqual(payrolls, []);
  });

  it("parses contract salary years, options, FA status, and notes", async () => {
    const html = await fixture("spotrac-team-yearly.html");
    const contracts = parseTeamContracts(html, "LAL");
    assert.equal(contracts.length, 2);
    assert.deepEqual(
      contracts[0].salaries.map((salary) => [salary.season, salary.amount, salary.option]),
      [
        ["2026-27", 25_000_000, "none"],
        ["2027-28", 27_000_000, "player"],
        ["2028-29", null, "ufa"],
      ]
    );
    assert.equal(contracts[0].freeAgencyYear, "2028-29");
    assert.equal(contracts[0].freeAgencyType, "UFA");
    assert.equal(contracts[1].salaries[1].option, "team");
    assert.deepEqual(contracts[1].notes, ["Trade restriction: December 15"]);
  });

  it("derives current payroll from a team yearly summary", async () => {
    const html = await fixture("spotrac-team-yearly.html");
    const contracts = parseTeamContracts(html, "LAL");
    assert.deepEqual(parseTeamPayrollFromYearly(html, "LAL", contracts), {
      team: "LAL",
      season: "2026-27",
      playersActive: 2,
      avgAge: 29,
      totalCap: 212_000_000,
      capSpace: -47_039_000,
      activeCap: 200_000_000,
      deadCap: 5_000_000,
    });
  });

  it("selects the requested team-summary season and treats an empty dead-cap cell as zero", async () => {
    const html = await fixture("spotrac-team-yearly.html");
    const contracts = parseTeamContracts(html, "LAL");
    assert.deepEqual(
      parseTeamPayrollFromYearly(html, "LAL", contracts, {
        season: "2027-28",
      }),
      {
        team: "LAL",
        season: "2027-28",
        playersActive: 2,
        avgAge: 29,
        totalCap: 195_000_000,
        capSpace: -20_966_000,
        activeCap: 170_000_000,
        deadCap: 0,
      }
    );
  });

  it("rejects a team summary that omits a required payroll row", async () => {
    const html = (await fixture("spotrac-team-yearly.html")).replace(
      "Dead Cap",
      "Dead Money"
    );
    const contracts = parseTeamContracts(html, "LAL");
    assert.throws(
      () => parseTeamPayrollFromYearly(html, "LAL", contracts),
      /missing dead cap for 2026-27/
    );
  });

  it("parses per-team future picks and their conditions", async () => {
    const picks = parseTeamDraftPicks(
      await fixture("spotrac-team-yearly.html"),
      "LAL"
    );
    assert.equal(picks.length, 2);
    assert.deepEqual(
      picks.map((pick) => [pick.year, pick.round, pick.originalTeam, pick.currentOwner]),
      [
        [2028, 1, "BOS", "LAL"],
        [2029, 2, "LAL", "LAL"],
      ]
    );
    assert.equal(picks[0].protections, "Top-5 protected");
    assert.equal(picks[0].isConditional, true);
  });

  it("parses the league future-pick owner view", async () => {
    const picks = parseLeagueDraftPicks(
      await fixture("spotrac-future-draft.html")
    );
    assert.deepEqual(
      picks.map((pick) => [pick.year, pick.round, pick.originalTeam, pick.currentOwner]),
      [
        [2028, 1, "BOS", "ATL"],
        [2029, 2, "ATL", "ATL"],
      ]
    );
    assert.equal(picks[0].protections, "Top-5 protected");
  });
});

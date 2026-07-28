import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { LEAGUE_STAFF } from "./staff.ts";
import { TEAMS } from "./teams.ts";

describe("LEAGUE_STAFF", () => {
  it("covers every NBA team exactly once", () => {
    assert.equal(LEAGUE_STAFF.length, TEAMS.length);
    assert.deepEqual(
      [...new Set(LEAGUE_STAFF.map((row) => row.team))].sort(),
      TEAMS.map((team) => team.abbr).sort()
    );
  });

  it("has an executive and head coach for every team", () => {
    for (const row of LEAGUE_STAFF) {
      assert.ok(row.executive.trim(), `${row.team} is missing an executive`);
      assert.ok(row.headCoach.trim(), `${row.team} is missing a head coach`);
    }
  });
});

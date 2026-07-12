import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DraftPick, PlayerContract } from "./types.ts";
import {
  compareTeamRows,
  countOwnedPicks,
  defaultDirForTeamSort,
  salaryWeightedAge,
} from "./teamsMetrics.ts";

function pick(
  partial: Partial<DraftPick> & Pick<DraftPick, "currentOwner" | "round">
): DraftPick {
  return {
    id: "x",
    year: 2027,
    originalTeam: partial.currentOwner,
    description: "",
    protections: null,
    isSwap: false,
    isConditional: false,
    via: null,
    ...partial,
  };
}

function contract(
  partial: Partial<PlayerContract> &
    Pick<PlayerContract, "team" | "age" | "currentSalary">
): PlayerContract {
  return {
    id: "c",
    player: "P",
    position: "G",
    salaries: [],
    guaranteed: null,
    freeAgencyYear: null,
    freeAgencyType: null,
    contractYears: 1,
    notes: [],
    ...partial,
  };
}

describe("countOwnedPicks", () => {
  const picks = [
    pick({ currentOwner: "OKC", round: 1 }),
    pick({ currentOwner: "OKC", round: 1 }),
    pick({ currentOwner: "OKC", round: 2 }),
    pick({ currentOwner: "BOS", round: 1 }),
  ];

  it("counts all and first-round only", () => {
    assert.equal(countOwnedPicks(picks).OKC, 3);
    assert.equal(countOwnedPicks(picks, 1).OKC, 2);
    assert.equal(countOwnedPicks(picks, 1).BOS, 1);
    assert.equal(countOwnedPicks(picks, 2).OKC, 1);
  });
});

describe("salaryWeightedAge", () => {
  it("weights by salary", () => {
    const age = salaryWeightedAge([
      contract({ team: "BOS", age: 20, currentSalary: 1_000_000 }),
      contract({ team: "BOS", age: 30, currentSalary: 9_000_000 }),
    ]);
    // (20*1 + 30*9) / 10 = 29
    assert.equal(age, 29);
  });

  it("returns null without usable data", () => {
    assert.equal(salaryWeightedAge([]), null);
    assert.equal(
      salaryWeightedAge([contract({ team: "BOS", age: null, currentSalary: 5 })]),
      null
    );
  });
});

describe("compareTeamRows + direction", () => {
  const young = {
    name: "Alpha",
    spending: 100,
    roomCap: 10,
    picks: 2,
    firstRound: 1,
    avgAge: 24,
    weightedAge: 23,
  };
  const old = {
    name: "Zeta",
    spending: 200,
    roomCap: -5,
    picks: 5,
    firstRound: 4,
    avgAge: 28,
    weightedAge: 29,
  };

  it("defaults: metrics desc, name asc", () => {
    assert.equal(defaultDirForTeamSort("payroll"), "desc");
    assert.equal(defaultDirForTeamSort("name"), "asc");
  });

  it("sorts first-round picks both ways", () => {
    assert.ok(compareTeamRows(young, old, "first", "desc") > 0); // old first
    assert.ok(compareTeamRows(young, old, "first", "asc") < 0); // young first
  });

  it("sorts weighted age both ways", () => {
    assert.ok(compareTeamRows(young, old, "wage", "desc") > 0);
    assert.ok(compareTeamRows(young, old, "wage", "asc") < 0);
  });

  it("sorts payroll both ways", () => {
    assert.ok(compareTeamRows(young, old, "payroll", "desc") > 0);
    assert.ok(compareTeamRows(young, old, "payroll", "asc") < 0);
  });

  it("sorts name both ways", () => {
    assert.ok(compareTeamRows(young, old, "name", "asc") < 0);
    assert.ok(compareTeamRows(young, old, "name", "desc") > 0);
  });
});

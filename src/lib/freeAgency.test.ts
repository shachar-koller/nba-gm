import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  parseCompactMoney,
  effectiveFreeAgencyYear,
  effectiveFreeAgencyType,
  ageAtFa,
  seasonSortKey,
  faCapHold,
  isTwoWay,
} from "./freeAgency.ts";
import type { PlayerContract } from "./types.ts";

function contract(partial: Partial<PlayerContract> & { player: string }): PlayerContract {
  return {
    id: partial.id ?? "1",
    player: partial.player,
    team: partial.team ?? "LAL",
    position: partial.position ?? "PG",
    age: partial.age ?? 28,
    currentSalary: partial.currentSalary ?? 10_000_000,
    guaranteed: partial.guaranteed ?? null,
    contractYears: partial.contractYears ?? 2,
    freeAgencyYear: partial.freeAgencyYear ?? null,
    freeAgencyType: partial.freeAgencyType ?? null,
    salaries: partial.salaries ?? [],
    notes: partial.notes ?? [],
  };
}

describe("parseCompactMoney", () => {
  it("parses M/K suffixes and plain dollar amounts", () => {
    assert.equal(parseCompactMoney("$31.5M"), 31_500_000);
    assert.equal(parseCompactMoney("$2.6M"), 2_600_000);
    assert.equal(parseCompactMoney("$1,234,567"), 1_234_567);
    assert.equal(parseCompactMoney("$500K"), 500_000);
    assert.equal(parseCompactMoney(null), null);
    assert.equal(parseCompactMoney("nope"), null);
  });
});

describe("effectiveFreeAgencyYear / Type", () => {
  it("prefers explicit freeAgencyYear", () => {
    const c = contract({
      player: "A",
      freeAgencyYear: "2028-29",
      salaries: [{ season: "2027-28", amount: 1, display: "$1", option: "ufa", pctOfCap: null }],
    });
    assert.equal(effectiveFreeAgencyYear(c), "2028-29");
  });

  it("falls back to UFA/RFA salary row", () => {
    const c = contract({
      player: "B",
      freeAgencyYear: null,
      salaries: [
        { season: "2026-27", amount: 5, display: "$5", option: "none", pctOfCap: null },
        { season: "2027-28", amount: null, display: "UFA", option: "rfa", pctOfCap: null },
      ],
    });
    assert.equal(effectiveFreeAgencyYear(c), "2027-28");
    assert.equal(effectiveFreeAgencyType(c), "RFA");
  });
});

describe("ageAtFa + seasonSortKey", () => {
  it("projects age by season delta", () => {
    const c = contract({ player: "C", age: 25 });
    assert.equal(ageAtFa(c, "2026-27", "2028-29"), 27);
    assert.equal(seasonSortKey("2027-28"), 2027);
  });
});

describe("faCapHold + isTwoWay", () => {
  it("reads hold amount from FA row", () => {
    const c = contract({
      player: "D",
      salaries: [
        {
          season: "2027-28",
          amount: 20_000_000,
          display: "$20.0M",
          option: "ufa",
          pctOfCap: null,
        },
      ],
    });
    assert.equal(faCapHold(c).amount, 20_000_000);
  });

  it("detects two-way contracts", () => {
    const c = contract({
      player: "E",
      salaries: [
        { season: "2026-27", amount: null, display: "Two-Way", option: "two-way", pctOfCap: null },
      ],
    });
    assert.equal(isTwoWay(c), true);
  });
});

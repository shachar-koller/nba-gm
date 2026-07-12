import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  positionFilterLabel,
  positionMatches,
  positionTokens,
} from "./positions.ts";

describe("positionTokens", () => {
  it("splits multi-position tags", () => {
    assert.deepEqual(positionTokens("PG-SG"), ["PG", "SG"]);
    assert.deepEqual(positionTokens("G/F"), ["G", "F"]);
    assert.deepEqual(positionTokens("  pf  "), ["PF"]);
  });
});

describe("positionMatches", () => {
  it("G includes PG, SG, and G", () => {
    assert.equal(positionMatches("G", "PG"), true);
    assert.equal(positionMatches("G", "SG"), true);
    assert.equal(positionMatches("G", "G"), true);
    assert.equal(positionMatches("G", "SF"), false);
    assert.equal(positionMatches("G", "C"), false);
  });

  it("F includes SF, PF, and F", () => {
    assert.equal(positionMatches("F", "SF"), true);
    assert.equal(positionMatches("F", "PF"), true);
    assert.equal(positionMatches("F", "F"), true);
    assert.equal(positionMatches("F", "PG"), false);
    assert.equal(positionMatches("F", "C"), false);
  });

  it("specific slots stay exact", () => {
    assert.equal(positionMatches("PG", "PG"), true);
    assert.equal(positionMatches("PG", "SG"), false);
    assert.equal(positionMatches("PG", "G"), false);
    assert.equal(positionMatches("C", "C"), true);
    assert.equal(positionMatches("C", "PF"), false);
  });

  it("matches multi-position players", () => {
    assert.equal(positionMatches("PG", "PG-SG"), true);
    assert.equal(positionMatches("G", "PG-SG"), true);
    assert.equal(positionMatches("F", "SG-SF"), true);
    assert.equal(positionMatches("C", "PF-C"), true);
  });

  it("empty filter matches all", () => {
    assert.equal(positionMatches("", "PG"), true);
    assert.equal(positionMatches("  ", "C"), true);
  });
});

describe("positionFilterLabel", () => {
  it("clarifies broad groups", () => {
    assert.match(positionFilterLabel("G"), /guards/i);
    assert.match(positionFilterLabel("F"), /forwards/i);
  });
});

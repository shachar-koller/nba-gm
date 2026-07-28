import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  CAP_THRESHOLDS,
  effectivePayroll,
  getApronStatus,
  getCurrentCap,
  apronStatusLabel,
  roomToLine,
} from "./cap.ts";

const cap = CAP_THRESHOLDS[0];

describe("getApronStatus", () => {
  it("classifies boundary values inclusively", () => {
    assert.equal(getApronStatus(cap.secondApron, cap), "second-apron");
    assert.equal(getApronStatus(cap.secondApron - 1, cap), "first-apron");
    assert.equal(getApronStatus(cap.firstApron, cap), "first-apron");
    assert.equal(getApronStatus(cap.firstApron - 1, cap), "tax");
    assert.equal(getApronStatus(cap.luxuryTax, cap), "tax");
    assert.equal(getApronStatus(cap.luxuryTax - 1, cap), "over-cap");
    assert.equal(getApronStatus(cap.salaryCap, cap), "over-cap");
    assert.equal(getApronStatus(cap.salaryCap - 1, cap), "under-cap");
  });
});

describe("effectivePayroll", () => {
  it("prefers active + dead when active > 0", () => {
    assert.equal(
      effectivePayroll({ activeCap: 100, deadCap: 20, totalCap: 999 }),
      120
    );
  });

  it("falls back to totalCap when active is 0", () => {
    assert.equal(
      effectivePayroll({ activeCap: 0, deadCap: 50, totalCap: 200 }),
      200
    );
  });

  it("treats null/undefined as zero", () => {
    assert.equal(effectivePayroll({}), 0);
    assert.equal(effectivePayroll({ activeCap: null, deadCap: null }), 0);
  });
});

describe("getCurrentCap", () => {
  it("returns first threshold or hard-coded fallback", () => {
    assert.equal(getCurrentCap(CAP_THRESHOLDS).season, CAP_THRESHOLDS[0].season);
    assert.equal(getCurrentCap([]).season, CAP_THRESHOLDS[0].season);
  });
});

describe("apronStatusLabel + roomToLine", () => {
  it("labels every status", () => {
    assert.equal(apronStatusLabel("under-cap"), "Under Cap");
    assert.equal(apronStatusLabel("over-cap"), "Over Cap");
    assert.equal(apronStatusLabel("tax"), "Luxury Tax");
    assert.equal(apronStatusLabel("first-apron"), "First Apron");
    assert.equal(apronStatusLabel("second-apron"), "Second Apron");
  });

  it("computes room as line minus payroll", () => {
    assert.equal(roomToLine(100, 150), 50);
    assert.equal(roomToLine(200, 150), -50);
  });
});

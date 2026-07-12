import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampActiveIndex,
  formatModShortcut,
  formatModShortcutSpoken,
  formatPaletteOpenHint,
  formatRowCount,
  isApplePlatform,
  scoreSearchMatch,
  shouldClearSearchOnEscape,
} from "./ux.ts";

describe("formatRowCount", () => {
  it("shows singular and plural without total", () => {
    assert.equal(formatRowCount(1), "Showing 1 row");
    assert.equal(formatRowCount(0), "Showing 0 rows");
    assert.equal(formatRowCount(42), "Showing 42 rows");
  });

  it("shows filtered of total when they differ", () => {
    assert.equal(formatRowCount(3, 120), "Showing 3 of 120");
  });

  it("omits total when equal to shown", () => {
    assert.equal(formatRowCount(10, 10), "Showing 10 rows");
  });
});

describe("clampActiveIndex", () => {
  it("clamps to valid range", () => {
    assert.equal(clampActiveIndex(-1, 5), 0);
    assert.equal(clampActiveIndex(99, 5), 4);
    assert.equal(clampActiveIndex(2, 5), 2);
  });

  it("handles empty lists", () => {
    assert.equal(clampActiveIndex(3, 0), 0);
  });
});

describe("scoreSearchMatch", () => {
  it("prefers exact and prefix matches", () => {
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL · $40M", "luka doncic"), 100);
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL · $40M", "luka"), 80);
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL · $40M", "donc"), 50);
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL · $40M", "dal"), 30);
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL", "dal"), 100);
  });

  it("returns null for non-matches", () => {
    assert.equal(scoreSearchMatch("Home", undefined, "zzz"), null);
  });

  it("returns 0 for empty query (browse mode)", () => {
    assert.equal(scoreSearchMatch("Home", undefined, "  "), 0);
  });
});

describe("shouldClearSearchOnEscape", () => {
  it("clears only when field has content", () => {
    assert.equal(shouldClearSearchOnEscape("luka"), true);
    assert.equal(shouldClearSearchOnEscape("   "), false);
    assert.equal(shouldClearSearchOnEscape(""), false);
  });
});

describe("platform shortcuts (Windows vs Mac)", () => {
  it("detects Apple from platform / UA", () => {
    assert.equal(isApplePlatform("MacIntel", ""), true);
    assert.equal(isApplePlatform("iPhone", ""), true);
    assert.equal(isApplePlatform("Win32", "Mozilla/5.0 (Windows NT 10.0)"), false);
    assert.equal(isApplePlatform("Linux x86_64", "X11; Linux"), false);
    assert.equal(isApplePlatform("", "Macintosh; Intel Mac OS X"), true);
  });

  it("labels Ctrl on Windows and ⌘ on Apple", () => {
    assert.equal(formatModShortcut(false), "Ctrl+K");
    assert.equal(formatModShortcut(true), "⌘K");
    assert.equal(formatModShortcutSpoken(false), "Control K");
    assert.equal(formatModShortcutSpoken(true), "Command K");
    assert.match(formatPaletteOpenHint(false), /Ctrl\+K/);
    assert.match(formatPaletteOpenHint(true), /⌘K/);
    assert.doesNotMatch(formatPaletteOpenHint(false), /⌘/);
  });
});

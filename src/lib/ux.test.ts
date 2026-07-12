import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  clampActiveIndex,
  formatModShortcut,
  formatModShortcutSpoken,
  formatPaletteOpenHint,
  formatRowCount,
  isApplePlatform,
  levenshtein,
  matchesSearch,
  normalizeSearchText,
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

describe("normalizeSearchText", () => {
  it("strips diacritics from European names", () => {
    assert.equal(normalizeSearchText("Nikola Jokić"), "nikola jokic");
    assert.equal(normalizeSearchText("Luka Dončić"), "luka doncic");
    assert.equal(normalizeSearchText("Bogdan Bogdanović"), "bogdan bogdanovic");
    assert.equal(normalizeSearchText("Kristaps Porziņģis"), "kristaps porzingis");
    assert.equal(normalizeSearchText("Vasilije Micić"), "vasilije micic");
  });

  it("drops apostrophes so O'Neal matches oneal", () => {
    assert.equal(normalizeSearchText("Shaquille O'Neal"), "shaquille oneal");
    assert.equal(normalizeSearchText("o'neal"), "oneal");
    // U+2019 right single quotation mark (common in pasted names)
    assert.equal(normalizeSearchText("O\u2019Neal"), "oneal");
    assert.equal(normalizeSearchText("De'Aaron Fox"), "deaaron fox");
  });

  it("treats hyphens and punctuation as spaces", () => {
    assert.equal(normalizeSearchText("Karl-Anthony Towns"), "karl anthony towns");
    assert.equal(normalizeSearchText("DAL · $40M"), "dal 40m");
  });
});

describe("levenshtein", () => {
  it("counts edits", () => {
    assert.equal(levenshtein("doncic", "doncic"), 0);
    assert.equal(levenshtein("doncik", "doncic"), 1);
    assert.equal(levenshtein("lebrn", "lebron"), 1);
  });
});

describe("scoreSearchMatch", () => {
  it("prefers exact and prefix matches", () => {
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL · $40M", "luka doncic"), 100);
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL · $40M", "luka"), 80);
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL · $40M", "donc"), 50);
    // "dal" is a prefix of hint "dal 40m"
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL · $40M", "dal"), 40);
    assert.equal(scoreSearchMatch("Luka Doncic", "DAL", "dal"), 100);
  });

  it("matches European names without requiring diacritics", () => {
    assert.ok((scoreSearchMatch("Nikola Jokić", "DEN · $50M", "jokic") ?? 0) >= 50);
    assert.ok((scoreSearchMatch("Nikola Jokić", "DEN", "jokić") ?? 0) >= 50);
    assert.ok((scoreSearchMatch("Luka Dončić", "DAL", "doncic") ?? 0) >= 50);
    assert.ok((scoreSearchMatch("Bogdan Bogdanović", "ATL", "bogdanovic") ?? 0) >= 50);
  });

  it("matches apostrophe names with or without the mark", () => {
    assert.ok((scoreSearchMatch("Shaquille O'Neal", "LAL", "oneal") ?? 0) >= 50);
    assert.ok((scoreSearchMatch("Shaquille O'Neal", "LAL", "o'neal") ?? 0) >= 50);
    assert.ok((scoreSearchMatch("De'Aaron Fox", "SAC", "deaaron") ?? 0) >= 50);
    assert.ok((scoreSearchMatch("De'Aaron Fox", "SAC", "de'aaron") ?? 0) >= 50);
  });

  it("supports multi-token queries across label and hint", () => {
    const score = scoreSearchMatch("Luka Doncic", "DAL · $40M", "luka dal");
    assert.ok(score != null && score >= 50);
  });

  it("allows light fuzzy typos on longer tokens", () => {
    assert.ok((scoreSearchMatch("Luka Doncic", "DAL", "doncik") ?? 0) > 0);
    assert.ok((scoreSearchMatch("LeBron James", "LAL", "lebrn") ?? 0) > 0);
    assert.ok((scoreSearchMatch("Nikola Jokić", "DEN", "jokik") ?? 0) > 0);
  });

  it("does not fuzzy-match very short queries", () => {
    assert.equal(scoreSearchMatch("Home", undefined, "zz"), null);
    assert.equal(scoreSearchMatch("Al Horford", "BOS", "xy"), null);
  });

  it("returns null for non-matches", () => {
    assert.equal(scoreSearchMatch("Home", undefined, "zzz"), null);
  });

  it("returns 0 for empty query (browse mode)", () => {
    assert.equal(scoreSearchMatch("Home", undefined, "  "), 0);
  });
});

describe("matchesSearch", () => {
  it("matches any field and treats empty query as match-all", () => {
    assert.equal(matchesSearch("", "Nikola Jokić"), true);
    assert.equal(matchesSearch("jokic", "Nikola Jokić"), true);
    assert.equal(matchesSearch("oneal", "Shaquille O'Neal", "LAL"), true);
    assert.equal(matchesSearch("doncik", "Luka Doncic"), true);
    assert.equal(matchesSearch("zzz", "Home"), false);
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

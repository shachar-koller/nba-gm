import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toCsv } from "./csv.ts";

describe("toCsv", () => {
  it("joins headers and rows", () => {
    const csv = toCsv(["a", "b"], [[1, 2], [3, 4]]);
    assert.equal(csv, "a,b\n1,2\n3,4");
  });

  it("quotes cells with commas and escapes quotes", () => {
    const csv = toCsv(["name", "note"], [["O'Neil, Jr.", 'said "hi"']]);
    assert.equal(csv, 'name,note\n"O\'Neil, Jr.","said ""hi"""');
  });

  it("quotes newlines and treats null as empty", () => {
    const csv = toCsv(["x"], [["line1\nline2"], [null], [undefined]]);
    assert.equal(csv, 'x\n"line1\nline2"\n\n');
  });

  it("neutralizes formula-like cells", () => {
    const csv = toCsv(["name"], [["=cmd()"], ["+1"], ["@SUM(A1)"]]);
    assert.equal(csv, "name\n'=cmd()\n'+1\n'@SUM(A1)");
  });
});

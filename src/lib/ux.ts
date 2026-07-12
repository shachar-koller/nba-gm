/**
 * Shared UX helpers for scannable tables, command palette, and filter controls.
 */

/** Human-readable table result count for the sticky results strip. */
export function formatRowCount(shown: number, total?: number): string {
  const n = Math.max(0, Math.floor(shown));
  const shownLabel = n.toLocaleString("en-US");
  if (total != null && Number.isFinite(total) && total !== n) {
    const totalLabel = Math.max(0, Math.floor(total)).toLocaleString("en-US");
    return `Showing ${shownLabel} of ${totalLabel}`;
  }
  const noun = n === 1 ? "row" : "rows";
  return `Showing ${shownLabel} ${noun}`;
}

/** Keep palette / list keyboard selection inside [0, length). */
export function clampActiveIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  if (!Number.isFinite(index)) return 0;
  return Math.max(0, Math.min(Math.floor(index), length - 1));
}

/**
 * Apostrophe-like marks to drop so O'Neal / O’Neal / De'Aaron collapse cleanly.
 * Includes straight, curly, and modifier apostrophes.
 */
const APOSTROPHE_RE =
  /['\u0060\u00b4\u2018\u2019\u201b\u2032\u2035\u02bc\u02b9\u02bb]/g;

/**
 * Normalize text for search: case-fold, strip diacritics (Jokic),
 * drop apostrophes (O'Neal -> oneal), treat other punctuation as spaces.
 */
export function normalizeSearchText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(APOSTROPHE_RE, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Word tokens from normalized search text. */
export function searchTokens(input: string): string[] {
  const n = normalizeSearchText(input);
  return n ? n.split(" ") : [];
}

type MatchKind = "exact" | "prefix" | "includes" | "fuzzy";

/** Classic Levenshtein edit distance (fine for short name tokens). */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Ensure a is the shorter string for slightly less work.
  if (a.length > b.length) {
    const t = a;
    a = b;
    b = t;
  }
  const prev = new Array<number>(a.length + 1);
  const curr = new Array<number>(a.length + 1);
  for (let i = 0; i <= a.length; i++) prev[i] = i;
  for (let j = 1; j <= b.length; j++) {
    curr[0] = j;
    const bj = b.charCodeAt(j - 1);
    for (let i = 1; i <= a.length; i++) {
      const cost = a.charCodeAt(i - 1) === bj ? 0 : 1;
      curr[i] = Math.min(
        prev[i]! + 1,
        curr[i - 1]! + 1,
        prev[i - 1]! + cost
      );
    }
    for (let i = 0; i <= a.length; i++) prev[i] = curr[i]!;
  }
  return prev[a.length]!;
}

function maxEditDistance(len: number): number {
  if (len < 3) return 0;
  if (len <= 5) return 1;
  return 2;
}

function matchTokenAgainstWord(token: string, word: string): MatchKind | null {
  if (!token || !word) return null;
  if (word === token) return "exact";
  if (word.startsWith(token)) return "prefix";
  if (word.includes(token)) return "includes";
  // Short tokens never fuzzy — too noisy ("al", "li").
  const max = maxEditDistance(token.length);
  if (max <= 0) return null;
  if (Math.abs(word.length - token.length) > max) return null;
  if (levenshtein(token, word) <= max) return "fuzzy";
  return null;
}

const KIND_RANK: Record<MatchKind, number> = {
  exact: 4,
  prefix: 3,
  includes: 2,
  fuzzy: 1,
};

function bestTokenMatch(token: string, words: string[]): MatchKind | null {
  let best: MatchKind | null = null;
  for (const w of words) {
    const kind = matchTokenAgainstWord(token, w);
    if (!kind) continue;
    if (!best || KIND_RANK[kind] > KIND_RANK[best]) best = kind;
    if (best === "exact") break;
  }
  return best;
}

/**
 * Rank a command-palette item against a query.
 * Higher is better; null means no match.
 *
 * Ladder: exact → prefix → substring → multi-token → light fuzzy.
 * Diacritics and apostrophes are normalized first.
 */
export function scoreSearchMatch(
  label: string,
  hint: string | undefined,
  query: string
): number | null {
  const qNorm = normalizeSearchText(query);
  if (!qNorm) return 0;

  const lNorm = normalizeSearchText(label);
  const hNorm = normalizeSearchText(hint ?? "");
  const lCompact = lNorm.replace(/ /g, "");
  const hCompact = hNorm.replace(/ /g, "");
  const qCompact = qNorm.replace(/ /g, "");

  // Exact (full field)
  if (lNorm === qNorm || hNorm === qNorm) return 100;
  if (lCompact === qCompact || hCompact === qCompact) return 98;

  // Prefix / contiguous substring on label or hint
  if (lNorm.startsWith(qNorm) || lCompact.startsWith(qCompact)) return 80;
  if (lNorm.includes(qNorm) || lCompact.includes(qCompact)) return 50;
  if (hNorm.startsWith(qNorm) || hCompact.startsWith(qCompact)) return 40;
  if (hNorm.includes(qNorm) || hCompact.includes(qCompact)) return 30;

  const qTokens = qNorm.split(" ");
  const lTokens = lNorm ? lNorm.split(" ") : [];
  const hTokens = hNorm ? hNorm.split(" ") : [];
  const allWords = [...lTokens, ...hTokens];

  // Every query token must land on some word (exact / prefix / includes / fuzzy).
  const kinds = qTokens.map((t) => bestTokenMatch(t, allWords));
  if (kinds.every((k): k is MatchKind => k != null)) {
    const hasFuzzy = kinds.some((k) => k === "fuzzy");
    if (qTokens.length === 1) {
      const k = kinds[0]!;
      if (k === "exact") return 70;
      if (k === "prefix") return 55;
      if (k === "includes") return 45;
      return 22; // fuzzy single token
    }
    // Multi-token: "luka dal", "nikola jokic"
    if (hasFuzzy) return 32;
    const allStrong = kinds.every(
      (k) => k === "exact" || k === "prefix" || k === "includes"
    );
    return allStrong ? 60 : 40;
  }

  // Last resort: light fuzzy of full compact query against each word / compact field.
  const max = maxEditDistance(qCompact.length);
  if (max > 0) {
    for (const w of allWords) {
      if (
        Math.abs(w.length - qCompact.length) <= max &&
        levenshtein(qCompact, w) <= max
      ) {
        return 20;
      }
    }
    if (
      lCompact.length > 0 &&
      Math.abs(lCompact.length - qCompact.length) <= max &&
      levenshtein(qCompact, lCompact) <= max
    ) {
      return 18;
    }
  }

  return null;
}

/**
 * Table / filter search: true if the query matches any field.
 * Empty query matches everything. Uses the same normalization + fuzzy rules
 * as the command palette.
 */
export function matchesSearch(
  query: string,
  ...fields: Array<string | null | undefined>
): boolean {
  if (!normalizeSearchText(query)) return true;
  const hay = fields
    .filter((f): f is string => typeof f === "string" && f.length > 0)
    .join(" ");
  if (!hay) return false;
  return scoreSearchMatch(hay, undefined, query) != null;
}

/** Whether Escape on a search field should clear rather than bubble. */
export function shouldClearSearchOnEscape(value: string): boolean {
  return value.trim().length > 0;
}

/**
 * Detect Apple platforms (⌘) vs Windows/Linux (Ctrl).
 * Pass navigator fields for testability; in browsers omit args.
 */
export function isApplePlatform(
  platform?: string | null,
  userAgent?: string | null
): boolean {
  const p = platform ?? "";
  const ua = userAgent ?? "";
  if (/Mac|iPhone|iPad|iPod/i.test(p)) return true;
  // navigator.platform is often empty on modern browsers; UA still has Mac.
  if (/Macintosh|Mac OS X|iPhone|iPad|iPod/i.test(ua)) return true;
  return false;
}

/** Compact chord label for UI chrome: "⌘K" on Apple, "Ctrl+K" elsewhere. */
export function formatModShortcut(isApple: boolean, key = "K"): string {
  const k = key.toUpperCase();
  return isApple ? `⌘${k}` : `Ctrl+${k}`;
}

/** Accessible long form: "Command K" / "Control K". */
export function formatModShortcutSpoken(isApple: boolean, key = "K"): string {
  const k = key.toUpperCase();
  return isApple ? `Command ${k}` : `Control ${k}`;
}

/** Footer / tooltip hint for opening the command palette. */
export function formatPaletteOpenHint(isApple: boolean): string {
  return `↑↓ navigate · Enter open · Esc close · / or ${formatModShortcut(isApple)} to open`;
}

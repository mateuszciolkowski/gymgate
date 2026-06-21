const PL_MAP: Record<string, string> = {
  ą: "a", ć: "c", ę: "e", ł: "l", ń: "n",
  ó: "o", ś: "s", ź: "z", ż: "z",
};

function normalize(s: string): string {
  return s.toLowerCase().replace(/[ąćęłńóśźż]/g, (c) => PL_MAP[c] ?? c);
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j];
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1]);
      prev = tmp;
    }
  }
  return dp[n];
}

function tokenTolerance(token: string): number {
  if (token.length <= 2) return 0;
  if (token.length <= 4) return 1;
  if (token.length <= 8) return 2;
  return 3;
}

/** Check if queryToken fuzzy-matches any word in textWords */
function tokenMatches(queryToken: string, textWords: string[]): boolean {
  const tol = tokenTolerance(queryToken);
  for (const word of textWords) {
    if (word.includes(queryToken)) return true;
    if (levenshtein(queryToken, word) <= tol) return true;
    // partial: compare against prefix of word of same length (±tol)
    if (word.length > queryToken.length) {
      const prefix = word.slice(0, queryToken.length + tol);
      if (levenshtein(queryToken, prefix) <= tol) return true;
    }
  }
  return false;
}

/**
 * Token-based fuzzy match with Polish diacritic normalization.
 * Every token in query must fuzzy-match at least one word in text.
 * Order doesn't matter: "wyciskanie hantlem" matches "wyciskanie francuskie hantlem".
 */
export function fuzzyMatch(text: string, query: string): boolean {
  if (!query.trim()) return true;
  const textWords = normalize(text).split(/\s+/).filter(Boolean);
  const queryTokens = normalize(query).split(/\s+/).filter(Boolean);
  return queryTokens.every((token) => tokenMatches(token, textWords));
}

/** Client-safe plagiarism result types. */

export type PlagiarismMatch = {
  quote: string;
  score: number;
  url?: string;
  title?: string;
  snippet?: string;
};

export type PlagiarismResultPayload = {
  /** 0–100; higher = more overlap / originality risk */
  score: number;
  summary: string;
  webSearchEnabled: boolean;
  matches: PlagiarismMatch[];
};

export function parsePlagiarismResult(raw: unknown): PlagiarismResultPayload {
  const obj =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const matchesRaw = Array.isArray(obj.matches) ? obj.matches : [];
  const matches: PlagiarismMatch[] = [];
  for (const m of matchesRaw) {
    if (!m || typeof m !== "object") continue;
    const row = m as Record<string, unknown>;
    const quote = typeof row.quote === "string" ? row.quote.trim() : "";
    if (!quote) continue;
    const score =
      typeof row.score === "number" && Number.isFinite(row.score)
        ? Math.max(0, Math.min(100, row.score))
        : 0;
    matches.push({
      quote,
      score,
      url: typeof row.url === "string" ? row.url : undefined,
      title: typeof row.title === "string" ? row.title : undefined,
      snippet: typeof row.snippet === "string" ? row.snippet : undefined,
    });
  }
  const score =
    typeof obj.score === "number" && Number.isFinite(obj.score)
      ? Math.max(0, Math.min(100, Math.round(obj.score)))
      : matches.length
        ? Math.round(
            matches.reduce((a, m) => a + m.score, 0) / Math.max(1, matches.length)
          )
        : 0;
  return {
    score,
    summary:
      typeof obj.summary === "string" && obj.summary.trim()
        ? obj.summary.trim()
        : matches.length
          ? `Found ${matches.length} passage(s) with possible overlap risk.`
          : "No strong overlap signals found.",
    webSearchEnabled: Boolean(obj.webSearchEnabled),
    matches,
  };
}

import OpenAI from "openai";
import { hasOpenAIKey } from "@/lib/openai-embed";
import { PLAGIARISM_MIN_CHARS } from "@/lib/plagiarism-check-client";
import {
  parsePlagiarismResult,
  type PlagiarismMatch,
  type PlagiarismResultPayload,
} from "@/lib/plagiarism-types";

const MODEL = process.env.OPENAI_PLAGIARISM_MODEL?.trim() || "gpt-4o-mini";
const MAX_QUOTES = 8;

export { hasOpenAIKey as hasPlagiarismOpenAIKey };
export { PLAGIARISM_MIN_CHARS };

export function hasSerperKey(): boolean {
  return Boolean(process.env.SERPER_API_KEY?.trim());
}

function client(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

type ExtractedQuote = { quote: string; risk: number };

async function analyzeDocument(document: string): Promise<{
  quotes: ExtractedQuote[];
  summary: string;
  score: number;
}> {
  const openai = client();
  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You help detect possible plagiarism / unoriginal writing.
Return JSON only:
{
  "quotes": [{ "quote": "exact or near-exact phrase from the document", "risk": 0-100 }],
  "summary": "1-2 sentence originality assessment",
  "score": 0-100
}
Rules:
- Pick up to ${MAX_QUOTES} distinctive phrases (8–40 words) that look copied, generic textbook, or highly searchable.
- risk is how likely that phrase appears elsewhere on the web (100 = very likely).
- score is overall originality risk for the document (higher = more risk).
- Prefer concrete claims, definitions, and unique wording over stopwords.`,
      },
      {
        role: "user",
        content: `Document:\n${document.slice(0, 40_000)}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content || "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Plagiarism analysis response was not valid JSON");
  }
  const obj =
    parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  const quotesRaw = Array.isArray(obj.quotes) ? obj.quotes : [];
  const quotes: ExtractedQuote[] = [];
  for (const q of quotesRaw) {
    if (!q || typeof q !== "object") continue;
    const row = q as Record<string, unknown>;
    const quote = typeof row.quote === "string" ? row.quote.trim() : "";
    if (quote.length < 12) continue;
    const risk =
      typeof row.risk === "number" && Number.isFinite(row.risk)
        ? Math.max(0, Math.min(100, row.risk))
        : 50;
    quotes.push({ quote: quote.slice(0, 280), risk });
    if (quotes.length >= MAX_QUOTES) break;
  }

  const summary =
    typeof obj.summary === "string" && obj.summary.trim()
      ? obj.summary.trim()
      : quotes.length
        ? `Found ${quotes.length} passage(s) with possible overlap risk.`
        : "No strong overlap signals found.";
  const score =
    typeof obj.score === "number" && Number.isFinite(obj.score)
      ? Math.max(0, Math.min(100, Math.round(obj.score)))
      : quotes.length
        ? Math.round(quotes.reduce((a, q) => a + q.risk, 0) / quotes.length)
        : 0;

  return { quotes, summary, score };
}

type SerperOrganic = {
  title?: string;
  link?: string;
  snippet?: string;
};

async function serperSearch(query: string): Promise<SerperOrganic[]> {
  const key = process.env.SERPER_API_KEY?.trim();
  if (!key) return [];
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: `"${query.slice(0, 200)}"`, num: 3 }),
  });
  if (!res.ok) return [];
  const data = (await res.json().catch(() => null)) as {
    organic?: SerperOrganic[];
  } | null;
  return Array.isArray(data?.organic) ? data!.organic!.slice(0, 3) : [];
}

function snippetOverlapScore(quote: string, snippet: string): number {
  const a = quote.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
  const b = new Set(snippet.toLowerCase().split(/\W+/).filter((w) => w.length > 3));
  if (!a.length) return 0;
  let hit = 0;
  for (const w of a) if (b.has(w)) hit++;
  return Math.round((hit / a.length) * 100);
}

/** Run plagiarism / originality check for a document. */
export async function runPlagiarismCheck(document: string): Promise<PlagiarismResultPayload> {
  const text = document.trim();
  if (text.length < PLAGIARISM_MIN_CHARS) {
    throw new Error(
      `Enter at least ${PLAGIARISM_MIN_CHARS} characters for plagiarism check`
    );
  }

  const analyzed = await analyzeDocument(text);
  const webSearchEnabled = hasSerperKey();
  const matches: PlagiarismMatch[] = [];

  if (webSearchEnabled && analyzed.quotes.length) {
    for (const q of analyzed.quotes) {
      const organic = await serperSearch(q.quote);
      if (!organic.length) {
        matches.push({ quote: q.quote, score: Math.round(q.risk * 0.6) });
        continue;
      }
      let best: PlagiarismMatch = {
        quote: q.quote,
        score: q.risk,
      };
      for (const hit of organic) {
        const overlap = hit.snippet
          ? snippetOverlapScore(q.quote, hit.snippet)
          : 40;
        const score = Math.round(Math.min(100, q.risk * 0.45 + overlap * 0.55));
        if (!best.url || score >= (best.score || 0)) {
          best = {
            quote: q.quote,
            score,
            url: hit.link,
            title: hit.title,
            snippet: hit.snippet,
          };
        }
      }
      matches.push(best);
    }
  } else {
    for (const q of analyzed.quotes) {
      matches.push({ quote: q.quote, score: q.risk });
    }
  }

  matches.sort((a, b) => b.score - a.score);

  const score =
    webSearchEnabled && matches.length
      ? Math.round(matches.reduce((a, m) => a + m.score, 0) / matches.length)
      : analyzed.score;

  return parsePlagiarismResult({
    score,
    summary: analyzed.summary,
    webSearchEnabled,
    matches,
  });
}

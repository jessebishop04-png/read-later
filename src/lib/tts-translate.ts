import OpenAI from "openai";
import { hasOpenAIKey } from "@/lib/openai-embed";
import { languageLabel } from "@/lib/tts";

const MODEL = process.env.OPENAI_TTS_TRANSLATE_MODEL?.trim() || "gpt-4o-mini";
const BATCH = 40;
const GOOGLE_BATCH_CHARS = 3200;
const GOOGLE_CONCURRENCY = 4;
/** Marker unlikely to appear in article text; survives most MT engines. */
const MARK = (i: number) => `⟦${i}⟧`;
const MARK_RE = /⟦(\d+)⟧/g;

function client(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  return new OpenAI({ apiKey: key });
}

export { hasOpenAIKey };

/** Map BCP-47 / locale to a Google Translate language code. */
function googleLangCode(targetLang: string): string {
  const raw = targetLang.trim().toLowerCase();
  const base = raw.split("-")[0] || raw;
  // Google uses zh-CN / zh-TW; keep region when Chinese.
  if (base === "zh" && raw.includes("-")) {
    return raw === "zh-tw" || raw === "zh-hk" ? "zh-TW" : "zh-CN";
  }
  return base;
}

async function translateOneGoogle(
  text: string,
  tl: string
): Promise<string> {
  const q = text.slice(0, 4500);
  if (!q.trim()) return text;
  const url =
    "https://translate.googleapis.com/translate_a/single" +
    `?client=gtx&sl=auto&tl=${encodeURIComponent(tl)}&dt=t&q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Translate request failed (${res.status})`);
  }
  const data = (await res.json()) as unknown;
  if (!Array.isArray(data) || !Array.isArray(data[0])) {
    throw new Error("Unexpected translate response");
  }
  const parts = data[0] as unknown[];
  const joined = parts
    .map((p) => (Array.isArray(p) && typeof p[0] === "string" ? p[0] : ""))
    .join("");
  return joined || text;
}

function unpackMarked(translated: string, expected: number): string[] | null {
  const matches = [...translated.matchAll(MARK_RE)];
  if (matches.length !== expected) return null;
  const out: string[] = [];
  for (let k = 0; k < matches.length; k++) {
    const m = matches[k]!;
    const start = (m.index ?? 0) + m[0].length;
    const end =
      k + 1 < matches.length ? (matches[k + 1]!.index ?? translated.length) : translated.length;
    out.push(translated.slice(start, end).replace(/^\s+|\s+$/g, ""));
  }
  return out;
}

type GoogleBatch = { start: number; parts: string[] };

function packGoogleBatches(texts: string[]): GoogleBatch[] {
  const batches: GoogleBatch[] = [];
  let parts: string[] = [];
  let start = 0;
  let len = 0;

  for (let i = 0; i < texts.length; i++) {
    const piece = texts[i]!.slice(0, 1800);
    const add = MARK(parts.length).length + piece.length + 1;
    if (parts.length && len + add > GOOGLE_BATCH_CHARS) {
      batches.push({ start, parts });
      parts = [];
      start = i;
      len = 0;
    }
    parts.push(piece);
    len += add;
  }
  if (parts.length) batches.push({ start, parts });
  return batches;
}

async function translateBatchGoogle(
  parts: string[],
  tl: string
): Promise<string[]> {
  const packed = parts.map((t, i) => `${MARK(i)}${t}`).join("\n");
  const translated = await translateOneGoogle(packed, tl);
  const unpacked = unpackMarked(translated, parts.length);
  if (unpacked) return unpacked;

  // Marker lost — fall back to one request per segment for this batch only.
  const out: string[] = [];
  for (const p of parts) {
    out.push(await translateOneGoogle(p, tl));
  }
  return out;
}

async function translateWithGoogle(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  const tl = googleLangCode(targetLang);
  const batches = packGoogleBatches(texts);
  const out: string[] = new Array(texts.length);
  let next = 0;

  async function worker() {
    while (true) {
      const i = next++;
      if (i >= batches.length) return;
      const batch = batches[i]!;
      const translated = await translateBatchGoogle(batch.parts, tl);
      for (let j = 0; j < batch.parts.length; j++) {
        out[batch.start + j] = translated[j] ?? texts[batch.start + j]!;
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(GOOGLE_CONCURRENCY, batches.length) },
    () => worker()
  );
  await Promise.all(workers);
  return out;
}

async function translateWithOpenAI(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  const label = languageLabel(targetLang);
  const openai = client();
  const out: string[] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const payload = slice.map((t, idx) => ({
      i: idx,
      t: t.slice(0, 4000),
    }));

    const res = await openai.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You translate reading-app article segments for text-to-speech.
Translate each item's "t" into ${label} (${targetLang}).
Keep meaning faithful; keep numbers and proper nouns when appropriate.
Return JSON only: {"items":[{"i":0,"t":"..."}, ...]}.
Preserve array length and "i" indices exactly. Do not merge or skip items.
If text is already in ${label}, return it unchanged.`,
        },
        {
          role: "user",
          content: JSON.stringify({ items: payload }),
        },
      ],
    });

    const raw = res.choices[0]?.message?.content || "{}";
    let parsed: { items?: { i?: number; t?: string }[] };
    try {
      parsed = JSON.parse(raw) as { items?: { i?: number; t?: string }[] };
    } catch {
      throw new Error("Translation response was not valid JSON");
    }

    const byIndex = new Map<number, string>();
    for (const item of parsed.items || []) {
      if (typeof item.i === "number" && typeof item.t === "string") {
        byIndex.set(item.i, item.t);
      }
    }

    for (let j = 0; j < slice.length; j++) {
      out[i + j] = byIndex.get(j) ?? slice[j]!;
    }
  }

  return out;
}

/**
 * Translate texts into targetLang (BCP-47 or ISO 639-1, e.g. "fr", "de-DE").
 * Prefers OpenAI when configured; otherwise uses a free translate endpoint.
 * Returns one string per input, same order/length.
 */
export async function translateTexts(
  texts: string[],
  targetLang: string
): Promise<string[]> {
  if (texts.length === 0) return [];
  if (hasOpenAIKey()) {
    try {
      return await translateWithOpenAI(texts, targetLang);
    } catch (e) {
      // Fall through to free translator if OpenAI fails.
      console.warn("[tts-translate] OpenAI failed, using fallback:", e);
    }
  }
  return translateWithGoogle(texts, targetLang);
}

import OpenAI from "openai";

const MODEL = "text-embedding-3-small";
const BATCH = 100;

export function hasOpenAIKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

function client(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  return new OpenAI({ apiKey: key });
}

/** Embed one or more strings. Empty strings are skipped and return zero-length vectors placeholders. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  const openai = client();
  const out: number[][] = new Array(texts.length);

  for (let i = 0; i < texts.length; i += BATCH) {
    const slice = texts.slice(i, i + BATCH);
    const inputs = slice.map((t) => (t.trim() === "" ? " " : t.slice(0, 8000)));
    const res = await openai.embeddings.create({
      model: MODEL,
      input: inputs,
    });
    const byIndex = new Map(res.data.map((d) => [d.index, d.embedding]));
    for (let j = 0; j < slice.length; j++) {
      const emb = byIndex.get(j);
      if (!emb) throw new Error("Missing embedding in OpenAI response");
      out[i + j] = emb;
    }
  }

  return out;
}

export async function embedQuery(q: string): Promise<number[]> {
  const [v] = await embedTexts([q]);
  return v;
}

import { createHash } from "crypto";

/** Rough char budget ~800 tokens (~4 chars/token). */
const CHUNK_CHARS = 3200;
const OVERLAP = 400;

export function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex").slice(0, 32);
}

export function chunkText(text: string): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  if (cleaned.length <= CHUNK_CHARS) return [cleaned];

  const chunks: string[] = [];
  let start = 0;
  while (start < cleaned.length) {
    let end = Math.min(start + CHUNK_CHARS, cleaned.length);
    if (end < cleaned.length) {
      const space = cleaned.lastIndexOf(" ", end);
      if (space > start + CHUNK_CHARS / 2) end = space;
    }
    const piece = cleaned.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= cleaned.length) break;
    start = Math.max(0, end - OVERLAP);
  }
  return chunks;
}

export function textToContentHtml(text: string, title: string): string {
  const paras = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `<p>${escapeHtml(p)}</p>`)
    .join("\n");
  return `<article><h1>${escapeHtml(title)}</h1>${paras || `<p>${escapeHtml(text.slice(0, 2000))}</p>`}</article>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  const denom = Math.sqrt(na) * Math.sqrt(nb);
  if (denom === 0) return 0;
  return dot / denom;
}

export function parseEmbedding(json: string): number[] {
  try {
    const v = JSON.parse(json) as unknown;
    if (!Array.isArray(v)) return [];
    return v.map((n) => Number(n)).filter((n) => Number.isFinite(n));
  } catch {
    return [];
  }
}

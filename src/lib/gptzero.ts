import {
  RUNNABLE_SCAN_TYPES,
  SCAN_MIN_CHARS,
  wordCount,
  type ScanResultPayload,
  type ScanSentence,
  type ScanTypeId,
} from "@/lib/scan-types";

export {
  RUNNABLE_SCAN_TYPES,
  SCAN_MIN_CHARS,
  wordCount,
  type ScanResultPayload,
  type ScanSentence,
  type ScanTypeId,
};

export function hasGptZeroKey(): boolean {
  return Boolean(process.env.GPTZERO_API_KEY?.trim());
}

function apiKey(): string {
  const key = process.env.GPTZERO_API_KEY?.trim();
  if (!key) throw new Error("GPTZERO_API_KEY is not configured");
  return key;
}

function asRecord(v: unknown): Record<string, unknown> | null {
  return v && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function num(v: unknown): number | undefined {
  return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

/** Normalize GPTZero predict/text JSON into a stable Keepr payload. */
export function normalizeGptZeroResponse(raw: unknown): ScanResultPayload {
  const root = asRecord(raw) ?? {};
  const documents = Array.isArray(root.documents) ? root.documents : null;
  const doc = asRecord(documents?.[0]) ?? root;

  const classProbabilitiesRaw = asRecord(doc.class_probabilities) ?? {};
  const classProbabilities: Record<string, number> = {};
  for (const [k, v] of Object.entries(classProbabilitiesRaw)) {
    const n = num(v);
    if (n != null) classProbabilities[k] = n;
  }

  const predictedClass =
    str(doc.document_classification) ||
    str(doc.predicted_class) ||
    (num(doc.completely_generated_prob) != null &&
    (doc.completely_generated_prob as number) >= 0.65
      ? "AI_ONLY"
      : num(doc.completely_generated_prob) != null &&
          (doc.completely_generated_prob as number) <= 0.35
        ? "HUMAN_ONLY"
        : "MIXED");

  const sentencesRaw = Array.isArray(doc.sentences) ? doc.sentences : [];
  const sentences: ScanSentence[] = [];
  for (const s of sentencesRaw) {
    const row = asRecord(s);
    if (!row) continue;
    const text = str(row.sentence) || str(row.text) || "";
    if (!text) continue;
    sentences.push({
      text,
      generatedProb: num(row.generated_prob) ?? 0,
      highlight: Boolean(row.highlight_sentence_for_ai),
    });
  }

  return {
    predictedClass,
    classProbabilities,
    confidence: str(doc.confidence_category) || str(doc.confidence),
    completelyGeneratedProb: num(doc.completely_generated_prob),
    averageGeneratedProb: num(doc.average_generated_prob),
    sentences,
  };
}

export async function predictText(document: string): Promise<ScanResultPayload> {
  const text = document.trim();
  if (text.length < SCAN_MIN_CHARS) {
    throw new Error(`Enter at least ${SCAN_MIN_CHARS} characters to scan`);
  }

  const res = await fetch("https://api.gptzero.me/v2/predict/text", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify({
      document: text.slice(0, 150_000),
      // GPTZero does not accept "latest"; pin to newest base model.
      version: "2026-07-04-base",
    }),
  });

  const raw = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const errObj = asRecord(raw);
    const message =
      str(errObj?.error) ||
      str(errObj?.message) ||
      `GPTZero request failed (${res.status})`;
    throw new Error(message);
  }

  return normalizeGptZeroResponse(raw);
}

export function parseScansRun(raw: string): ScanTypeId[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x): x is ScanTypeId =>
        x === "advanced_ai" ||
        x === "ai" ||
        x === "writing_feedback" ||
        x === "plagiarism"
    );
  } catch {
    return [];
  }
}

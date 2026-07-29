import OpenAI from "openai";
import { hasOpenAIKey } from "@/lib/openai-embed";
import { parseReviewResult, type ReviewResultPayload } from "@/lib/review-presets";

const MODEL = process.env.OPENAI_REVIEW_MODEL?.trim() || "gpt-4o-mini";

export { hasOpenAIKey as hasReviewOpenAIKey };

function client(): OpenAI {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) throw new Error("OPENAI_API_KEY is not configured");
  return new OpenAI({ apiKey: key });
}

export async function runWritingReview(input: {
  document: string;
  instructions: string;
  tone?: string | null;
  gradeLevel?: string | null;
}): Promise<ReviewResultPayload> {
  const text = input.document.trim().slice(0, 60_000);
  if (text.length < 50) {
    throw new Error("Enter more text to review");
  }

  const openai = client();
  const tone = input.tone?.trim() || "constructive";
  const grade = input.gradeLevel?.trim() || "General";

  const res = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0.4,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a careful writing reviewer for Keepr.
Follow the reviewer's instructions closely.
Tone: ${tone}. Audience / level: ${grade}.
Return JSON only with this shape:
{
  "summary": "2-4 sentence overall assessment",
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "revisionTask": "one clear next revision task",
  "scoreLabel": "optional short label like Strong / Developing / Needs work"
}
Be specific and actionable. Do not invent quotes that are not in the text.`,
      },
      {
        role: "user",
        content: `Reviewer instructions:\n${input.instructions.trim()}\n\n---\nDocument to review:\n${text}`,
      },
    ],
  });

  const raw = res.choices[0]?.message?.content || "{}";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Review response was not valid JSON");
  }
  return parseReviewResult(parsed);
}

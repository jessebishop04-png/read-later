import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { translateTexts } from "@/lib/tts-translate";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  texts?: unknown;
  targetLang?: unknown;
};

/** Translate article TTS segments into a target language. */
export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const targetLang =
    typeof body.targetLang === "string" ? body.targetLang.trim() : "";
  if (!targetLang || targetLang.length > 16) {
    return NextResponse.json({ error: "targetLang is required" }, { status: 400 });
  }

  if (!Array.isArray(body.texts) || body.texts.length === 0) {
    return NextResponse.json({ error: "texts must be a non-empty array" }, { status: 400 });
  }
  if (body.texts.length > 200) {
    return NextResponse.json({ error: "Too many segments (max 200)" }, { status: 400 });
  }

  const texts = body.texts.map((t) => (typeof t === "string" ? t : String(t ?? "")));

  try {
    const translations = await translateTexts(texts, targetLang);
    return NextResponse.json({ translations });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Translation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

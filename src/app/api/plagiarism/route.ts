import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeAuth } from "@/lib/safe-auth";
import {
  hasPlagiarismOpenAIKey,
  hasSerperKey,
  PLAGIARISM_MIN_CHARS,
  runPlagiarismCheck,
} from "@/lib/plagiarism-check";
import {
  parsePlagiarismResult,
  type PlagiarismResultPayload,
} from "@/lib/plagiarism-types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = new URL(req.url).searchParams.get("itemId")?.trim() || "";
  const configured = hasPlagiarismOpenAIKey();
  const webSearchEnabled = hasSerperKey();

  if (!itemId) {
    return NextResponse.json({ configured, webSearchEnabled, result: null });
  }

  const owned = await prisma.savedItem.findFirst({
    where: { id: itemId, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const row = await prisma.plagiarismRun.findFirst({
    where: { userId: session.user.id, itemId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    return NextResponse.json({ configured, webSearchEnabled, result: null });
  }

  let payload: PlagiarismResultPayload;
  try {
    payload = parsePlagiarismResult(JSON.parse(row.resultJson));
  } catch {
    return NextResponse.json({ configured, webSearchEnabled, result: null });
  }

  return NextResponse.json({
    configured,
    webSearchEnabled,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    result: payload,
  });
}

export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasPlagiarismOpenAIKey()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to .env to enable Plagiarism Check.",
      },
      { status: 400 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < PLAGIARISM_MIN_CHARS) {
    return NextResponse.json(
      {
        error: `Enter at least ${PLAGIARISM_MIN_CHARS} characters for plagiarism check`,
      },
      { status: 400 }
    );
  }

  const itemId = typeof body.itemId === "string" ? body.itemId.trim() : "";
  if (itemId) {
    const owned = await prisma.savedItem.findFirst({
      where: { id: itemId, userId: session.user.id },
      select: { id: true },
    });
    if (!owned) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }
  }

  const sourceRaw = typeof body.source === "string" ? body.source.trim() : "";
  const source =
    sourceRaw === "item" || sourceRaw === "paste" || sourceRaw === "upload"
      ? sourceRaw
      : itemId
        ? "item"
        : "paste";

  try {
    const result = await runPlagiarismCheck(text);
    const row = await prisma.plagiarismRun.create({
      data: {
        userId: session.user.id,
        itemId: itemId || null,
        source,
        inputText: text.slice(0, 200_000),
        resultJson: JSON.stringify(result),
      },
    });

    return NextResponse.json({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      result,
      configured: true,
      webSearchEnabled: result.webSearchEnabled,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Plagiarism check failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

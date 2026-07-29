import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeAuth } from "@/lib/safe-auth";
import {
  hasGptZeroKey,
  predictText,
} from "@/lib/gptzero";
import {
  RUNNABLE_SCAN_TYPES,
  SCAN_MIN_CHARS,
  wordCount,
  type ScanResultPayload,
  type ScanTypeId,
} from "@/lib/scan-types";

export const runtime = "nodejs";
export const maxDuration = 120;

type Body = {
  text?: unknown;
  title?: unknown;
  itemId?: unknown;
  source?: unknown;
  scans?: unknown;
};

function parseScans(raw: unknown): ScanTypeId[] {
  if (!Array.isArray(raw)) return [];
  const out: ScanTypeId[] = [];
  for (const x of raw) {
    if (
      x === "advanced_ai" ||
      x === "ai" ||
      x === "writing_feedback" ||
      x === "plagiarism"
    ) {
      out.push(x);
    }
  }
  return out;
}

function clientPayload(result: ScanResultPayload, opts: { includeSentences: boolean }) {
  return {
    predictedClass: result.predictedClass,
    classProbabilities: result.classProbabilities,
    confidence: result.confidence,
    completelyGeneratedProb: result.completelyGeneratedProb,
    averageGeneratedProb: result.averageGeneratedProb,
    sentences: opts.includeSentences ? result.sentences : [],
  };
}

/** Run an AI scan via GPTZero and persist the result. */
export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasGptZeroKey()) {
    return NextResponse.json(
      {
        error:
          "GPTZERO_API_KEY is not configured. Add it to .env to enable scanning.",
      },
      { status: 400 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (text.length < SCAN_MIN_CHARS) {
    return NextResponse.json(
      { error: `Enter at least ${SCAN_MIN_CHARS} characters to scan` },
      { status: 400 }
    );
  }

  const scans = parseScans(body.scans);
  const runnable = scans.filter((s) => RUNNABLE_SCAN_TYPES.includes(s));
  if (runnable.length === 0) {
    return NextResponse.json(
      {
        error:
          "Select Advanced AI Scan or AI Scan for detection. Writing Feedback and Plagiarism use their own endpoints.",
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
    sourceRaw === "item" || sourceRaw === "upload" || sourceRaw === "paste"
      ? sourceRaw
      : itemId
        ? "item"
        : "paste";

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : null;

  try {
    const result = await predictText(text);
    const includeSentences = runnable.includes("advanced_ai");
    const payload = clientPayload(result, { includeSentences });

    const row = await prisma.scanResult.create({
      data: {
        userId: session.user.id,
        itemId: itemId || null,
        source,
        title,
        inputText: text.slice(0, 200_000),
        wordCount: wordCount(text),
        scansRun: JSON.stringify(runnable),
        resultJson: JSON.stringify(payload),
      },
    });

    return NextResponse.json({
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      wordCount: row.wordCount,
      scansRun: runnable,
      result: payload,
      configured: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Scan failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** Latest scan for an item, or config status. */
export async function GET(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId")?.trim() || "";
  const configured = hasGptZeroKey();

  if (!itemId) {
    return NextResponse.json({ configured, result: null });
  }

  const owned = await prisma.savedItem.findFirst({
    where: { id: itemId, userId: session.user.id },
    select: { id: true },
  });
  if (!owned) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const row = await prisma.scanResult.findFirst({
    where: { userId: session.user.id, itemId },
    orderBy: { createdAt: "desc" },
  });

  if (!row) {
    return NextResponse.json({ configured, result: null });
  }

  let payload: ScanResultPayload;
  try {
    payload = JSON.parse(row.resultJson) as ScanResultPayload;
  } catch {
    return NextResponse.json({ configured, result: null });
  }

  let scansRun: ScanTypeId[] = [];
  try {
    scansRun = JSON.parse(row.scansRun) as ScanTypeId[];
  } catch {
    scansRun = [];
  }

  return NextResponse.json({
    configured,
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    wordCount: row.wordCount,
    scansRun,
    result: payload,
  });
}

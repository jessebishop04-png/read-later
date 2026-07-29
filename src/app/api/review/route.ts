import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeAuth } from "@/lib/safe-auth";
import { hasReviewOpenAIKey, runWritingReview } from "@/lib/review-openai";
import { parseReviewResult, type ReviewResultPayload } from "@/lib/review-presets";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function GET(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const itemId = new URL(req.url).searchParams.get("itemId")?.trim() || "";
  const configured = hasReviewOpenAIKey();

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

  const row = await prisma.reviewRun.findFirst({
    where: { userId: session.user.id, itemId },
    orderBy: { createdAt: "desc" },
  });
  if (!row) {
    return NextResponse.json({ configured, result: null });
  }

  let payload: ReviewResultPayload;
  try {
    payload = parseReviewResult(JSON.parse(row.resultJson));
  } catch {
    return NextResponse.json({ configured, result: null });
  }

  return NextResponse.json({
    configured,
    id: row.id,
    templateId: row.templateId,
    createdAt: row.createdAt.toISOString(),
    result: payload,
  });
}

export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasReviewOpenAIKey()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to .env to enable Writing Feedback.",
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
  if (text.length < 50) {
    return NextResponse.json({ error: "Enter more text to review" }, { status: 400 });
  }

  const templateId =
    typeof body.templateId === "string" ? body.templateId.trim() : "";
  let instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";
  let tone = typeof body.tone === "string" ? body.tone.trim() : null;
  let gradeLevel =
    typeof body.gradeLevel === "string" ? body.gradeLevel.trim() : null;

  if (templateId) {
    const template = await prisma.reviewTemplate.findFirst({
      where: {
        id: templateId,
        OR: [{ isBuiltin: true }, { userId: session.user.id }],
      },
    });
    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }
    if (!instructions) instructions = template.instructions;
    if (!tone) tone = template.tone;
    if (!gradeLevel) gradeLevel = template.gradeLevel;
  }

  if (!instructions) {
    return NextResponse.json(
      { error: "instructions or templateId is required" },
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
    sourceRaw === "item" || sourceRaw === "paste" ? sourceRaw : itemId ? "item" : "paste";

  // Optionally save as a new user template
  let savedTemplateId = templateId || null;
  if (body.saveAsTemplate === true && typeof body.templateName === "string") {
    const name = body.templateName.trim();
    if (name) {
      const created = await prisma.reviewTemplate.create({
        data: {
          userId: session.user.id,
          name: name.slice(0, 120),
          category: "custom",
          description: null,
          instructions: instructions.slice(0, 8000),
          tone,
          gradeLevel,
          isBuiltin: false,
        },
      });
      savedTemplateId = created.id;
    }
  }

  try {
    const result = await runWritingReview({
      document: text,
      instructions,
      tone,
      gradeLevel,
    });

    const row = await prisma.reviewRun.create({
      data: {
        userId: session.user.id,
        templateId: savedTemplateId,
        itemId: itemId || null,
        source,
        inputText: text.slice(0, 200_000),
        resultJson: JSON.stringify(result),
      },
    });

    return NextResponse.json({
      id: row.id,
      templateId: row.templateId,
      createdAt: row.createdAt.toISOString(),
      result,
      configured: true,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Review failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

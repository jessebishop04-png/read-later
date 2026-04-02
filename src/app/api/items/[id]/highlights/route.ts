import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

async function assertItemOwner(itemId: string, userId: string) {
  return prisma.savedItem.findFirst({
    where: { id: itemId, userId },
    select: { id: true, kind: true },
  });
}

export async function POST(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await context.params;
  const item = await assertItemOwner(itemId, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (item.kind === "video") {
    return NextResponse.json(
      { error: "Highlights are only supported on articles" },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const paragraphId = Number(body.paragraphId);
  const startInParagraph = Number(body.startInParagraph);
  const endInParagraph = Number(body.endInParagraph);
  const quotedText = typeof body.quotedText === "string" ? body.quotedText : "";

  if (
    !Number.isInteger(paragraphId) ||
    paragraphId < 0 ||
    !Number.isInteger(startInParagraph) ||
    !Number.isInteger(endInParagraph) ||
    endInParagraph < startInParagraph ||
    !quotedText
  ) {
    return NextResponse.json({ error: "Invalid highlight payload" }, { status: 400 });
  }

  const color =
    typeof body.color === "string" && ["amber", "green", "blue", "rose"].includes(body.color)
      ? body.color
      : "amber";

  let note: string | null = null;
  if ("note" in body) {
    if (body.note === null) {
      note = null;
    } else if (typeof body.note === "string") {
      const t = body.note.trim();
      note = t === "" ? null : t;
    } else {
      return NextResponse.json({ error: "Invalid note" }, { status: 400 });
    }
  }

  const h = await prisma.highlight.create({
    data: {
      itemId,
      paragraphId,
      startInParagraph,
      endInParagraph,
      quotedText,
      color,
      note,
    },
  });

  return NextResponse.json({
    id: h.id,
    paragraphId: h.paragraphId,
    startInParagraph: h.startInParagraph,
    endInParagraph: h.endInParagraph,
    quotedText: h.quotedText,
    color: h.color,
    note: h.note,
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await context.params;
  const item = await assertItemOwner(itemId, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));
  const highlightId = typeof body.highlightId === "string" ? body.highlightId : "";
  if (!highlightId) {
    return NextResponse.json({ error: "Missing highlightId" }, { status: 400 });
  }

  if (!("note" in body)) {
    return NextResponse.json({ error: "Missing note" }, { status: 400 });
  }

  let note: string | null;
  if (body.note === null) {
    note = null;
  } else if (typeof body.note === "string") {
    const t = body.note.trim();
    note = t === "" ? null : t;
  } else {
    return NextResponse.json({ error: "Invalid note" }, { status: 400 });
  }

  const result = await prisma.highlight.updateMany({
    where: { id: highlightId, itemId },
    data: { note },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, note });
}

export async function DELETE(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: itemId } = await context.params;
  const item = await assertItemOwner(itemId, session.user.id);
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { searchParams } = new URL(req.url);
  const highlightId = searchParams.get("highlightId");
  if (!highlightId) {
    return NextResponse.json({ error: "Missing highlightId" }, { status: 400 });
  }

  const result = await prisma.highlight.deleteMany({
    where: {
      id: highlightId,
      itemId,
    },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

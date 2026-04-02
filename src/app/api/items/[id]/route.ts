import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isLikelyHttpUrl, normalizeUrlInput } from "@/lib/normalize-url";

type RouteContext = { params: Promise<{ id: string }> };

type ItemGetPayload = Prisma.SavedItemGetPayload<{
  include: {
    tags: { include: { tag: true } };
    highlights: { orderBy: { createdAt: "asc" } };
    folder: { select: { id: true; name: true } };
  };
}>;

type ItemPatchResultPayload = Prisma.SavedItemGetPayload<{
  include: {
    tags: { include: { tag: true } };
    folder: { select: { id: true; name: true } };
  };
}>;

export async function GET(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const item: ItemGetPayload | null = await prisma.savedItem.findFirst({
    where: { id, userId: session.user.id },
    include: {
      tags: { include: { tag: true } },
      highlights: { orderBy: { createdAt: "asc" } },
      folder: { select: { id: true, name: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: item.id,
    sourceUrl: item.sourceUrl,
    title: item.title,
    author: item.author,
    excerpt: item.excerpt,
    siteName: item.siteName,
    contentHtml: item.contentHtml,
    imageUrl: item.imageUrl,
    embedUrl: item.embedUrl,
    kind: item.kind,
    readAt: item.readAt?.toISOString() ?? null,
    archived: item.archived,
    liked: item.liked,
    likedAt: item.likedAt?.toISOString() ?? null,
    notes: item.notes,
    folderId: item.folderId,
    folderName: item.folder?.name ?? null,
    createdAt: item.createdAt.toISOString(),
    tags: item.tags.map((t: ItemGetPayload["tags"][number]) => t.tag.name),
    highlights: item.highlights.map((h: ItemGetPayload["highlights"][number]) => ({
      id: h.id,
      paragraphId: h.paragraphId,
      startInParagraph: h.startInParagraph,
      endInParagraph: h.endInParagraph,
      quotedText: h.quotedText,
      color: h.color,
      note: h.note,
    })),
  });
}

export async function PATCH(req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const existing = await prisma.savedItem.findFirst({
    where: { id, userId: session.user.id },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json().catch(() => ({}));

  const hasTitle = "title" in body;
  const hasSourceUrl = "sourceUrl" in body;
  const hasExcerpt = "excerpt" in body;
  if (hasTitle || hasSourceUrl || hasExcerpt) {
    const data: { title?: string; sourceUrl?: string; excerpt?: string | null } = {};
    if (hasTitle) {
      if (typeof body.title !== "string") {
        return NextResponse.json({ error: "Invalid title" }, { status: 400 });
      }
      const t = body.title.trim();
      if (!t) {
        return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 });
      }
      data.title = t;
    }
    if (hasSourceUrl) {
      if (typeof body.sourceUrl !== "string") {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
      const u = normalizeUrlInput(body.sourceUrl);
      if (!u || !isLikelyHttpUrl(u)) {
        return NextResponse.json({ error: "Enter a valid http(s) URL" }, { status: 400 });
      }
      data.sourceUrl = u;
    }
    if (hasExcerpt) {
      const raw = body.excerpt;
      if (raw === null || raw === undefined) {
        data.excerpt = null;
      } else if (typeof raw === "string") {
        data.excerpt = raw.trim() === "" ? null : raw;
      } else {
        return NextResponse.json({ error: "Invalid description" }, { status: 400 });
      }
    }
    if (Object.keys(data).length > 0) {
      await prisma.savedItem.update({
        where: { id },
        data,
      });
    }
  }

  if (typeof body.archived === "boolean") {
    await prisma.savedItem.update({
      where: { id },
      data: { archived: body.archived },
    });
  }

  if (body.markRead === true) {
    await prisma.savedItem.update({
      where: { id },
      data: { readAt: new Date() },
    });
  }

  if (body.markUnread === true) {
    await prisma.savedItem.update({
      where: { id },
      data: { readAt: null },
    });
  }

  if (typeof body.tags === "object" && Array.isArray(body.tags)) {
    const names: string[] = body.tags
      .filter((t: unknown) => typeof t === "string")
      .map((t: string) => t.trim())
      .filter(Boolean);

    await prisma.itemTag.deleteMany({ where: { itemId: id } });
    for (const name of names) {
      const tag = await prisma.tag.upsert({
        where: {
          userId_name: { userId: session.user.id, name },
        },
        create: { userId: session.user.id, name },
        update: {},
      });
      await prisma.itemTag.create({
        data: { itemId: id, tagId: tag.id },
      });
    }
  }

  if (typeof body.liked === "boolean") {
    await prisma.savedItem.update({
      where: { id },
      data: {
        liked: body.liked,
        likedAt: body.liked ? new Date() : null,
      },
    });
  }

  if ("notes" in body) {
    const raw = body.notes;
    let notes: string | null | undefined;
    if (raw === null || raw === undefined) notes = null;
    else if (typeof raw === "string") notes = raw.trim() === "" ? null : raw;
    else notes = undefined;
    if (notes !== undefined) {
      await prisma.savedItem.update({
        where: { id },
        data: { notes },
      });
    }
  }

  if ("folderId" in body) {
    const fid = body.folderId;
    if (fid === null || fid === "") {
      await prisma.savedItem.update({
        where: { id },
        data: { folderId: null },
      });
    } else if (typeof fid === "string") {
      const folder = await prisma.folder.findFirst({
        where: { id: fid, userId: session.user.id },
      });
      if (folder) {
        await prisma.savedItem.update({
          where: { id },
          data: { folderId: fid },
        });
      }
    }
  }

  const updated: ItemPatchResultPayload | null = await prisma.savedItem.findFirst({
    where: { id, userId: session.user.id },
    include: { tags: { include: { tag: true } }, folder: { select: { id: true, name: true } } },
  });

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    sourceUrl: updated.sourceUrl,
    excerpt: updated.excerpt,
    archived: updated.archived,
    readAt: updated.readAt?.toISOString() ?? null,
    liked: updated.liked,
    notes: updated.notes,
    folderId: updated.folderId,
    folderName: updated.folder?.name ?? null,
    tags: updated.tags.map((t: ItemPatchResultPayload["tags"][number]) => t.tag.name),
  });
}

export async function DELETE(_req: Request, context: RouteContext) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const result = await prisma.savedItem.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

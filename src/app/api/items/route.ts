import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { extractFromUrl } from "@/lib/extract";
import { normalizeUrlInput } from "@/lib/normalize-url";
import { buildLibraryWhere } from "@/lib/library-where";

export const runtime = "nodejs";

type ListItemPayload = Prisma.SavedItemGetPayload<{
  include: {
    tags: { include: { tag: true } };
    folder: { select: { id: true; name: true } };
  };
}>;

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let view = searchParams.get("view") ?? undefined;
  if (searchParams.get("archived") === "true") {
    view = "archive";
  }

  const where = buildLibraryWhere(session.user.id, {
    view,
    tag: searchParams.get("tag"),
    folderId: searchParams.get("folderId"),
    q: searchParams.get("q"),
  });

  const items: ListItemPayload[] = await prisma.savedItem.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      tags: { include: { tag: true } },
      folder: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    items: items.map((i: ListItemPayload) => ({
      id: i.id,
      sourceUrl: i.sourceUrl,
      title: i.title,
      excerpt: i.excerpt,
      siteName: i.siteName,
      imageUrl: i.imageUrl,
      embedUrl: i.embedUrl,
      kind: i.kind,
      readAt: i.readAt?.toISOString() ?? null,
      archived: i.archived,
      liked: i.liked,
      hasNotes: Boolean(i.notes?.trim()),
      folderId: i.folderId,
      folderName: i.folder?.name ?? null,
      createdAt: i.createdAt.toISOString(),
      tags: i.tags.map((t: ListItemPayload["tags"][number]) => t.tag.name),
    })),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const raw = typeof body.url === "string" ? body.url.trim() : "";
    if (!raw) {
      return NextResponse.json({ error: "Missing url" }, { status: 400 });
    }
    const url = normalizeUrlInput(raw);

    const extracted = await extractFromUrl(url);
    const tagNames: string[] = Array.isArray(body.tags)
      ? body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean)
      : [];

    const created = await prisma.savedItem.create({
      data: {
        userId: session.user.id,
        sourceUrl: url,
        title: extracted.title,
        author: extracted.author,
        excerpt: extracted.excerpt,
        siteName: extracted.siteName,
        contentHtml: extracted.contentHtml,
        contentText: extracted.contentText,
        imageUrl: extracted.imageUrl,
        embedUrl: extracted.embedUrl ?? null,
        kind: extracted.kind,
      },
    });

    for (const name of tagNames) {
      const tag = await prisma.tag.upsert({
        where: {
          userId_name: { userId: session.user.id, name },
        },
        create: { userId: session.user.id, name },
        update: {},
      });
      await prisma.itemTag.create({
        data: { itemId: created.id, tagId: tag.id },
      });
    }

    return NextResponse.json({ id: created.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

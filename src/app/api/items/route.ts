import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { extractFromUrl } from "@/lib/extract";
import { normalizeUrlInput } from "@/lib/normalize-url";
import { buildLibraryWhere } from "@/lib/library-where";
import { scheduleReindex } from "@/lib/search-index";
import { extractPdfFromBuffer } from "@/lib/pdf-extract";
import { textToContentHtml } from "@/lib/search-text";
import { hybridSearchItemOrder } from "@/lib/semantic-search";
import { hasOpenAIKey } from "@/lib/openai-embed";

export const runtime = "nodejs";

type ListItemPayload = Prisma.SavedItemGetPayload<{
  include: {
    tags: { include: { tag: true } };
    folder: { select: { id: true; name: true } };
  };
}>;

function mapItem(
  i: ListItemPayload,
  matchSnippet?: string
) {
  return {
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
    ...(matchSnippet ? { matchSnippet } : {}),
  };
}

export async function GET(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  let view = searchParams.get("view") ?? undefined;
  if (searchParams.get("archived") === "true") {
    view = "archive";
  }
  const q = searchParams.get("q");
  const tag = searchParams.get("tag");
  const folderId = searchParams.get("folderId");

  if (q?.trim() && hasOpenAIKey()) {
    try {
      const hybrid = await hybridSearchItemOrder(session.user.id, q, {
        view,
        tag,
        folderId,
        limit: 50,
      });
      if (hybrid && hybrid.ids.length > 0) {
        const rows = await prisma.savedItem.findMany({
          where: { userId: session.user.id, id: { in: hybrid.ids } },
          include: {
            tags: { include: { tag: true } },
            folder: { select: { id: true, name: true } },
          },
        });
        const byId = new Map(rows.map((r) => [r.id, r]));
        const ordered = hybrid.ids
          .map((id) => byId.get(id))
          .filter(Boolean) as ListItemPayload[];
        return NextResponse.json({
          items: ordered.map((i) => mapItem(i, hybrid.snippets.get(i.id))),
          searchMode: "semantic",
        });
      }
      if (hybrid && hybrid.ids.length === 0) {
        return NextResponse.json({ items: [], searchMode: "semantic" });
      }
    } catch (e) {
      console.error("keepr: semantic search failed, falling back to keyword", e);
    }
  }

  const where = buildLibraryWhere(session.user.id, {
    view,
    tag,
    folderId,
    q,
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
    items: items.map((i) => mapItem(i)),
    searchMode: q?.trim() ? "keyword" : "none",
  });
}

async function trySaveAsPdf(
  userId: string,
  url: string,
  tagNames: string[]
): Promise<string | null> {
  const looksPdf = /\.pdf(\?|#|$)/i.test(url);
  let buf: Buffer | null = null;
  let contentType = "";

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/pdf,*/*" },
      redirect: "follow",
    });
    if (!res.ok) return null;
    contentType = res.headers.get("content-type") || "";
    if (!looksPdf && !contentType.includes("application/pdf")) return null;
    const ab = await res.arrayBuffer();
    buf = Buffer.from(ab);
  } catch {
    return null;
  }

  if (!buf || buf.length < 5) return null;
  if (buf.slice(0, 4).toString() !== "%PDF" && !contentType.includes("pdf")) {
    return null;
  }

  const nameGuess =
    decodeURIComponent(url.split("/").pop()?.split("?")[0] || "document.pdf").replace(
      /\.pdf$/i,
      ""
    ) || "PDF document";

  const extracted = await extractPdfFromBuffer(buf, nameGuess);
  const created = await prisma.savedItem.create({
    data: {
      userId,
      sourceUrl: url,
      title: extracted.title || nameGuess,
      excerpt: extracted.text.slice(0, 280),
      siteName: "PDF",
      contentHtml: textToContentHtml(extracted.text, extracted.title || nameGuess),
      contentText: extracted.text,
      kind: "pdf",
    },
  });

  for (const name of tagNames) {
    const tag = await prisma.tag.upsert({
      where: { userId_name: { userId, name } },
      create: { userId, name },
      update: {},
    });
    await prisma.itemTag.create({ data: { itemId: created.id, tagId: tag.id } });
  }

  scheduleReindex(created.id);
  return created.id;
}

export async function POST(req: Request) {
  const session = await safeAuth();
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
    const tagNames: string[] = Array.isArray(body.tags)
      ? body.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.trim()).filter(Boolean)
      : [];

    if (/\.pdf(\?|#|$)/i.test(url)) {
      const pdfId = await trySaveAsPdf(session.user.id, url, tagNames);
      if (pdfId) {
        return NextResponse.json({ id: pdfId, kind: "pdf" });
      }
    }

    const pageHtml = typeof body.html === "string" ? body.html : null;
    const extracted = await extractFromUrl(url, { html: pageHtml });

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

    scheduleReindex(created.id);
    return NextResponse.json({ id: created.id });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to save";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

import { prisma } from "@/lib/prisma";
import { embedTexts, hasOpenAIKey } from "@/lib/openai-embed";
import { chunkText, hashText, stripHtml } from "@/lib/search-text";

type CorpusPiece = {
  source: string;
  sourceId: string | null;
  text: string;
};

function buildPieces(item: {
  title: string;
  excerpt: string | null;
  siteName: string | null;
  author: string | null;
  contentText: string | null;
  contentHtml: string;
  notes: string | null;
  kind: string;
  highlights: { id: string; quotedText: string; note: string | null }[];
}): CorpusPiece[] {
  const pieces: CorpusPiece[] = [];

  const meta = [item.title, item.excerpt, item.siteName, item.author]
    .filter(Boolean)
    .join("\n");
  if (meta.trim()) {
    pieces.push({ source: "meta", sourceId: null, text: meta.trim() });
  }

  const body =
    item.contentText?.trim() ||
    (item.contentHtml ? stripHtml(item.contentHtml) : "");
  if (body) {
    const source =
      item.kind === "pdf" ? "pdf" : item.kind === "email" ? "email" : "body";
    for (const c of chunkText(body)) {
      pieces.push({ source, sourceId: null, text: c });
    }
  }

  if (item.notes?.trim()) {
    for (const c of chunkText(item.notes)) {
      pieces.push({ source: "notes", sourceId: null, text: c });
    }
  }

  for (const h of item.highlights) {
    const ht = [h.quotedText, h.note].filter(Boolean).join("\n").trim();
    if (!ht) continue;
    for (const c of chunkText(ht)) {
      pieces.push({ source: "highlight", sourceId: h.id, text: c });
    }
  }

  return pieces;
}

/** Reindex all search chunks for an item. No-op without OPENAI_API_KEY. */
export async function reindexItem(itemId: string): Promise<void> {
  if (!hasOpenAIKey()) return;

  const item = await prisma.savedItem.findUnique({
    where: { id: itemId },
    include: {
      highlights: { select: { id: true, quotedText: true, note: true } },
    },
  });
  if (!item) return;

  const pieces = buildPieces(item);
  if (pieces.length === 0) {
    await prisma.searchChunk.deleteMany({ where: { itemId } });
    return;
  }

  const embeddings = await embedTexts(pieces.map((p) => p.text));

  await prisma.$transaction(async (tx) => {
    await tx.searchChunk.deleteMany({ where: { itemId } });
    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      await tx.searchChunk.create({
        data: {
          userId: item.userId,
          itemId,
          source: p.source,
          sourceId: p.sourceId,
          chunkIndex: i,
          text: p.text,
          embedding: JSON.stringify(embeddings[i]),
          contentHash: hashText(`${p.source}:${p.sourceId ?? ""}:${p.text}`),
        },
      });
    }
  });
}

export function scheduleReindex(itemId: string): void {
  void reindexItem(itemId).catch((err) => {
    console.error("keepr: search reindex failed", itemId, err);
  });
}

export async function reindexAllForUser(
  userId: string
): Promise<{ indexed: number; failed: number }> {
  if (!hasOpenAIKey()) return { indexed: 0, failed: 0 };
  const items = await prisma.savedItem.findMany({
    where: { userId },
    select: { id: true },
    orderBy: { createdAt: "desc" },
  });
  let indexed = 0;
  let failed = 0;
  for (const it of items) {
    try {
      await reindexItem(it.id);
      indexed++;
    } catch (e) {
      failed++;
      console.error("keepr: reindex failed", it.id, e);
    }
  }
  return { indexed, failed };
}

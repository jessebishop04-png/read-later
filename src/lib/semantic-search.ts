import { prisma } from "@/lib/prisma";
import { embedQuery, hasOpenAIKey } from "@/lib/openai-embed";
import { cosineSimilarity, parseEmbedding } from "@/lib/search-text";
import { buildLibraryWhere } from "@/lib/library-where";

export type SemanticHit = {
  itemId: string;
  score: number;
  matchSnippet: string;
};

/**
 * Rank items for a user by semantic similarity to q.
 * Optionally restrict to item ids that pass library view filters (without q).
 */
export async function semanticSearchItems(
  userId: string,
  q: string,
  opts?: {
    view?: string | null;
    tag?: string | null;
    folderId?: string | null;
    limit?: number;
  }
): Promise<SemanticHit[] | null> {
  if (!hasOpenAIKey()) return null;
  const query = q.trim();
  if (!query) return null;

  const where = buildLibraryWhere(userId, {
    view: opts?.view,
    tag: opts?.tag,
    folderId: opts?.folderId,
    q: null,
  });

  const candidates = await prisma.savedItem.findMany({
    where,
    select: { id: true },
  });
  if (candidates.length === 0) return [];

  const candidateIds = new Set(candidates.map((c) => c.id));

  const chunks = await prisma.searchChunk.findMany({
    where: { userId, itemId: { in: [...candidateIds] } },
    select: { itemId: true, text: true, embedding: true },
  });
  if (chunks.length === 0) return [];

  const qVec = await embedQuery(query);
  const best = new Map<string, { score: number; snippet: string }>();

  for (const ch of chunks) {
    const vec = parseEmbedding(ch.embedding);
    const score = cosineSimilarity(qVec, vec);
    const prev = best.get(ch.itemId);
    if (!prev || score > prev.score) {
      best.set(ch.itemId, {
        score,
        snippet: ch.text.length > 180 ? `${ch.text.slice(0, 177)}…` : ch.text,
      });
    }
  }

  const limit = opts?.limit ?? 50;
  return [...best.entries()]
    .map(([itemId, v]) => ({
      itemId,
      score: v.score,
      matchSnippet: v.snippet,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Keyword hit ids (existing contains search), for hybrid boosting. */
export async function keywordItemIds(
  userId: string,
  q: string,
  opts?: {
    view?: string | null;
    tag?: string | null;
    folderId?: string | null;
  }
): Promise<string[]> {
  const where = buildLibraryWhere(userId, {
    view: opts?.view,
    tag: opts?.tag,
    folderId: opts?.folderId,
    q,
  });
  const rows = await prisma.savedItem.findMany({
    where,
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((r) => r.id);
}

/**
 * Hybrid: keyword matches first (boosted), then semantic-only hits by score.
 * Returns ordered item ids and snippet map.
 */
export async function hybridSearchItemOrder(
  userId: string,
  q: string,
  opts?: {
    view?: string | null;
    tag?: string | null;
    folderId?: string | null;
    limit?: number;
  }
): Promise<{ ids: string[]; snippets: Map<string, string> } | null> {
  const semantic = await semanticSearchItems(userId, q, opts);
  if (semantic === null) return null;

  const keywordIds = await keywordItemIds(userId, q, opts);
  const snippets = new Map<string, string>();
  for (const h of semantic) snippets.set(h.itemId, h.matchSnippet);

  const seen = new Set<string>();
  const ids: string[] = [];
  for (const id of keywordIds) {
    if (seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  for (const h of semantic) {
    if (h.score < 0.2) continue;
    if (seen.has(h.itemId)) continue;
    seen.add(h.itemId);
    ids.push(h.itemId);
  }

  const limit = opts?.limit ?? 50;
  return { ids: ids.slice(0, limit), snippets };
}

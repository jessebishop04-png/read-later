/**
 * Backfill search embeddings for the current user's library.
 * Usage (from project root, with OPENAI_API_KEY and DATABASE_URL set):
 *   node scripts/reindex-search.cjs [userEmail]
 */
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
process.chdir(root);

try {
  require("./sqlite-resolve.cjs").applyToEnv(root);
} catch {
  /* optional */
}

async function main() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient();

  // Dynamic import of TS libs via compiled path won't work; call OpenAI here inline
  // Prefer hitting the app API: use reindexAllForUser via registering in a small runner.
  // Load via ts-node not available — use prisma + openai directly duplicate of reindex.

  const email = process.argv[2];
  let userId;
  if (email) {
    const u = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!u) {
      console.error("User not found:", email);
      process.exit(1);
    }
    userId = u.id;
  } else {
    const u = await prisma.user.findFirst({ orderBy: { email: "asc" } });
    if (!u) {
      console.error("No users in database");
      process.exit(1);
    }
    userId = u.id;
    console.log("Using user", u.email);
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    console.error("Set OPENAI_API_KEY");
    process.exit(1);
  }

  // Spawn next isn't needed — call generate via openai package
  const OpenAI = require("openai");
  const crypto = require("crypto");
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY.trim() });

  function stripHtml(html) {
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function chunkText(text) {
    const CHUNK = 3200;
    const OVERLAP = 400;
    const cleaned = text.replace(/\s+/g, " ").trim();
    if (!cleaned) return [];
    if (cleaned.length <= CHUNK) return [cleaned];
    const chunks = [];
    let start = 0;
    while (start < cleaned.length) {
      let end = Math.min(start + CHUNK, cleaned.length);
      if (end < cleaned.length) {
        const space = cleaned.lastIndexOf(" ", end);
        if (space > start + CHUNK / 2) end = space;
      }
      const piece = cleaned.slice(start, end).trim();
      if (piece) chunks.push(piece);
      if (end >= cleaned.length) break;
      start = Math.max(0, end - OVERLAP);
    }
    return chunks;
  }

  const items = await prisma.savedItem.findMany({
    where: { userId },
    include: { highlights: true },
  });

  let indexed = 0;
  for (const item of items) {
    const pieces = [];
    const meta = [item.title, item.excerpt, item.siteName, item.author].filter(Boolean).join("\n");
    if (meta.trim()) pieces.push({ source: "meta", sourceId: null, text: meta.trim() });
    const body = item.contentText?.trim() || (item.contentHtml ? stripHtml(item.contentHtml) : "");
    if (body) {
      const source = item.kind === "pdf" ? "pdf" : "body";
      for (const c of chunkText(body)) pieces.push({ source, sourceId: null, text: c });
    }
    if (item.notes?.trim()) {
      for (const c of chunkText(item.notes)) pieces.push({ source: "notes", sourceId: null, text: c });
    }
    for (const h of item.highlights) {
      const ht = [h.quotedText, h.note].filter(Boolean).join("\n").trim();
      if (!ht) continue;
      for (const c of chunkText(ht)) pieces.push({ source: "highlight", sourceId: h.id, text: c });
    }

    await prisma.searchChunk.deleteMany({ where: { itemId: item.id } });
    if (pieces.length === 0) {
      indexed++;
      continue;
    }

    const emb = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: pieces.map((p) => p.text.slice(0, 8000)),
    });
    const byIndex = new Map(emb.data.map((d) => [d.index, d.embedding]));

    for (let i = 0; i < pieces.length; i++) {
      const p = pieces[i];
      const vector = byIndex.get(i);
      await prisma.searchChunk.create({
        data: {
          userId,
          itemId: item.id,
          source: p.source,
          sourceId: p.sourceId,
          chunkIndex: i,
          text: p.text,
          embedding: JSON.stringify(vector),
          contentHash: crypto.createHash("sha256").update(p.text).digest("hex").slice(0, 32),
        },
      });
    }
    indexed++;
    console.log("Indexed", item.title.slice(0, 60));
  }

  console.log("Done.", indexed, "items");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { extractFromUrl } from "@/lib/extract";
import { prisma } from "@/lib/prisma";
import { resolveUserIdFromBearer } from "@/lib/api-token";
import { normalizeUrlInput } from "@/lib/normalize-url";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let userId: string | null = null;

  const session = await auth();
  if (session?.user?.id) {
    userId = session.user.id;
  } else {
    userId = await resolveUserIdFromBearer(req.headers.get("authorization"));
  }

  if (!userId) {
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

    const item = await prisma.savedItem.create({
      data: {
        userId,
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

    return NextResponse.json({
      id: item.id,
      title: item.title,
      url: `/read/${item.id}`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Save failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

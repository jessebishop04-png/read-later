import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/search-text";
import { hasChatOpenAIKey, runKeeprChat, type ChatTurn } from "@/lib/keepr-chat";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function parseMessages(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw)) return null;
  const out: ChatTurn[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") return null;
    const role = (row as { role?: unknown }).role;
    const content = (row as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || !content.trim()) return null;
    out.push({ role, content: content.trim() });
  }
  return out;
}

export async function POST(req: Request, context: RouteContext) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!hasChatOpenAIKey()) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Add it to your environment and restart the server.",
      },
      { status: 503 }
    );
  }

  const { id } = await context.params;
  const body = (await req.json().catch(() => ({}))) as { messages?: unknown };
  const messages = parseMessages(body.messages);
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages required" }, { status: 400 });
  }
  if (messages[messages.length - 1]?.role !== "user") {
    return NextResponse.json({ error: "Last message must be from the user" }, { status: 400 });
  }

  const item = await prisma.savedItem.findFirst({
    where: { id, userId: session.user.id },
    select: { title: true, contentText: true, contentHtml: true },
  });
  if (!item) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const documentText =
    item.contentText?.trim() ||
    (item.contentHtml ? stripHtml(item.contentHtml) : "") ||
    "";

  try {
    const reply = await runKeeprChat({
      documentTitle: item.title,
      documentText,
      messages,
    });
    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Chat failed";
    console.error("keepr: chat failed", err);
    const status = /Send a question/i.test(msg) ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

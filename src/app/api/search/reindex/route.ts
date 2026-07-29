import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { reindexAllForUser } from "@/lib/search-index";
import { hasOpenAIKey } from "@/lib/openai-embed";

export const runtime = "nodejs";

/** Reindex the signed-in user's library for semantic search. */
export async function POST() {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!hasOpenAIKey()) {
    return NextResponse.json(
      { error: "OPENAI_API_KEY is not configured" },
      { status: 400 }
    );
  }

  const result = await reindexAllForUser(session.user.id);
  return NextResponse.json(result);
}

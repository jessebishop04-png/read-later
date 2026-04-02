import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { generateApiToken, hashToken } from "@/lib/api-token";

type ApiTokenListRow = Prisma.ApiTokenGetPayload<{
  select: { id: true; name: true; lastUsedAt: true; createdAt: true };
}>;

export async function GET() {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tokens: ApiTokenListRow[] = await prisma.apiToken.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      lastUsedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json({
    tokens: tokens.map((t: ApiTokenListRow) => ({
      id: t.id,
      name: t.name,
      lastUsedAt: t.lastUsedAt?.toISOString() ?? null,
      createdAt: t.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name =
    typeof body.name === "string" && body.name.trim()
      ? body.name.trim()
      : "Browser extension";

  const plain = generateApiToken();
  const tokenHash = hashToken(plain);

  await prisma.apiToken.create({
    data: {
      userId: session.user.id,
      name,
      tokenHash,
    },
  });

  return NextResponse.json({
    token: plain,
    message: "Copy this token now. It will not be shown again.",
  });
}

export async function DELETE(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const result = await prisma.apiToken.deleteMany({
    where: { id, userId: session.user.id },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

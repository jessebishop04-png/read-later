import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";

type FolderWithCount = Prisma.FolderGetPayload<{
  include: { _count: { select: { items: true } } };
}>;

export const runtime = "nodejs";

export async function GET() {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const folders: FolderWithCount[] = await prisma.folder.findMany({
    where: { userId: session.user.id },
    orderBy: { name: "asc" },
    include: { _count: { select: { items: true } } },
  });

  return NextResponse.json({
    folders: folders.map((f: FolderWithCount) => ({
      id: f.id,
      name: f.name,
      itemCount: f._count.items,
    })),
  });
}

export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
  }

  const folder = await prisma.folder.create({
    data: { userId: session.user.id, name },
  });

  return NextResponse.json({ id: folder.id, name: folder.name });
}

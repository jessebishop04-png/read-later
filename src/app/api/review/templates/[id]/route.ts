import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeAuth } from "@/lib/safe-auth";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const existing = await prisma.reviewTemplate.findFirst({
    where: { id, userId: session.user.id, isBuiltin: false },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const data: {
    name?: string;
    category?: string;
    description?: string | null;
    instructions?: string;
    tone?: string | null;
    gradeLevel?: string | null;
  } = {};

  if (typeof body.name === "string" && body.name.trim()) {
    data.name = body.name.trim().slice(0, 120);
  }
  if (typeof body.category === "string" && body.category.trim()) {
    data.category = body.category.trim();
  }
  if (typeof body.description === "string") {
    data.description = body.description.trim().slice(0, 300) || null;
  }
  if (typeof body.instructions === "string" && body.instructions.trim()) {
    data.instructions = body.instructions.trim().slice(0, 8000);
  }
  if (typeof body.tone === "string") {
    data.tone = body.tone.trim() || null;
  }
  if (typeof body.gradeLevel === "string") {
    data.gradeLevel = body.gradeLevel.trim() || null;
  }

  const updated = await prisma.reviewTemplate.update({
    where: { id },
    data,
  });

  return NextResponse.json({
    template: {
      ...updated,
      createdAt: updated.createdAt.toISOString(),
      updatedAt: updated.updatedAt.toISOString(),
    },
  });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await ctx.params;

  const existing = await prisma.reviewTemplate.findFirst({
    where: { id, userId: session.user.id, isBuiltin: false },
  });
  if (!existing) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  await prisma.reviewTemplate.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

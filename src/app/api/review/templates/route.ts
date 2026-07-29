import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeAuth } from "@/lib/safe-auth";
import { ensureBuiltinReviewTemplates } from "@/lib/review-seed";

export const runtime = "nodejs";

function serializeTemplate(t: {
  id: string;
  userId: string | null;
  name: string;
  category: string;
  description: string | null;
  instructions: string;
  tone: string | null;
  gradeLevel: string | null;
  isBuiltin: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: t.id,
    userId: t.userId,
    name: t.name,
    category: t.category,
    description: t.description,
    instructions: t.instructions,
    tone: t.tone,
    gradeLevel: t.gradeLevel,
    isBuiltin: t.isBuiltin,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

export async function GET() {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureBuiltinReviewTemplates();

  const templates = await prisma.reviewTemplate.findMany({
    where: {
      OR: [{ isBuiltin: true }, { userId: session.user.id }],
    },
    orderBy: [{ isBuiltin: "desc" }, { category: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ templates: templates.map(serializeTemplate) });
}

export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const instructions =
    typeof body.instructions === "string" ? body.instructions.trim() : "";
  if (!name || !instructions) {
    return NextResponse.json(
      { error: "name and instructions are required" },
      { status: 400 }
    );
  }

  const category =
    typeof body.category === "string" && body.category.trim()
      ? body.category.trim()
      : "custom";
  const description =
    typeof body.description === "string" ? body.description.trim() || null : null;
  const tone = typeof body.tone === "string" ? body.tone.trim() || null : null;
  const gradeLevel =
    typeof body.gradeLevel === "string" ? body.gradeLevel.trim() || null : null;

  const created = await prisma.reviewTemplate.create({
    data: {
      userId: session.user.id,
      name: name.slice(0, 120),
      category,
      description: description?.slice(0, 300) ?? null,
      instructions: instructions.slice(0, 8000),
      tone,
      gradeLevel,
      isBuiltin: false,
    },
  });

  return NextResponse.json({ template: serializeTemplate(created) });
}

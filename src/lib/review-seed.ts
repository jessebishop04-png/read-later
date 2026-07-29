import { prisma } from "@/lib/prisma";
import { REVIEW_PRESETS } from "@/lib/review-presets";

/** Ensure builtin review templates exist (idempotent). */
export async function ensureBuiltinReviewTemplates(): Promise<void> {
  const existing = await prisma.reviewTemplate.findMany({
    where: { isBuiltin: true },
    select: { name: true },
  });
  const names = new Set(existing.map((t) => t.name));

  for (const preset of REVIEW_PRESETS) {
    if (names.has(preset.name)) continue;
    await prisma.reviewTemplate.create({
      data: {
        userId: null,
        name: preset.name,
        category: preset.category,
        description: preset.description,
        instructions: preset.instructions,
        tone: preset.tone,
        gradeLevel: preset.gradeLevel,
        isBuiltin: true,
      },
    });
  }
}

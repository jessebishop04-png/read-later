import { prisma } from "@/lib/prisma";
import { scheduleReindex } from "@/lib/search-index";
import type { ExtractedEmail } from "@/lib/email-extract";

export async function createEmailSavedItem(
  userId: string,
  extracted: ExtractedEmail
): Promise<{ id: string; duplicated: boolean }> {
  const messageId = extracted.messageId;

  if (messageId) {
    const existing = await prisma.savedItem.findFirst({
      where: { userId, emailMessageId: messageId },
      select: { id: true },
    });
    if (existing) return { id: existing.id, duplicated: true };
  }

  const sourceKey = messageId
    ? encodeURIComponent(messageId)
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  try {
    const created = await prisma.savedItem.create({
      data: {
        userId,
        sourceUrl: `keepr://email/${sourceKey}`,
        title: extracted.subject,
        author: extracted.from,
        excerpt: extracted.excerpt,
        siteName: "Email",
        contentHtml: extracted.contentHtml,
        contentText: extracted.contentText,
        kind: "email",
        emailFrom: extracted.fromAddress || extracted.from,
        emailMessageId: messageId,
      },
      select: { id: true },
    });
    scheduleReindex(created.id);
    return { id: created.id, duplicated: false };
  } catch (err) {
    // Race on unique (userId, emailMessageId)
    if (messageId) {
      const existing = await prisma.savedItem.findFirst({
        where: { userId, emailMessageId: messageId },
        select: { id: true },
      });
      if (existing) return { id: existing.id, duplicated: true };
    }
    throw err;
  }
}

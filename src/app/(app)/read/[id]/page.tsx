import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { ArticleReader } from "@/components/article-reader";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { ReadArticleHeader } from "@/components/read-article-header";
import { RegisterReadChrome } from "@/components/register-read-chrome";
import { ReadWorkspace } from "@/components/read-workspace";

export default async function ReadPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await safeAuth();
  if (!session?.user?.id) return null;

  const { id } = await params;

  type ReadItem = Prisma.SavedItemGetPayload<{
    include: {
      tags: { include: { tag: true } };
      highlights: { orderBy: { createdAt: "asc" } };
    };
  }>;

  let item: ReadItem | null;
  let folders: { id: string; name: string }[];

  try {
    const result = await Promise.all([
      prisma.savedItem.findFirst({
        where: { id, userId: session.user.id },
        include: {
          tags: { include: { tag: true } },
          highlights: { orderBy: { createdAt: "asc" } },
        },
      }),
      prisma.folder.findMany({
        where: { userId: session.user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
    ]);
    item = result[0];
    folders = result[1];
  } catch {
    return <DbSetupNotice />;
  }

  if (!item) notFound();

  const highlightDtos = item.highlights.map((h: ReadItem["highlights"][number]) => ({
    id: h.id,
    paragraphId: h.paragraphId,
    startInParagraph: h.startInParagraph,
    endInParagraph: h.endInParagraph,
    quotedText: h.quotedText,
    color: h.color,
    note: h.note,
  }));

  return (
    <ReadWorkspace
      item={{
        id: item.id,
        title: item.title,
        author: item.author,
        siteName: item.siteName,
        sourceUrl: item.sourceUrl,
        excerpt: item.excerpt,
        kind: item.kind,
        createdAt: item.createdAt.toISOString(),
        contentText: item.contentText,
        contentHtml: item.contentHtml,
        notes: item.notes,
        imageUrl: item.imageUrl,
        highlights: highlightDtos.map((h) => ({
          id: h.id,
          quotedText: h.quotedText,
          color: h.color,
          note: h.note,
        })),
      }}
    >
      <RegisterReadChrome
        itemId={item.id}
        title={item.title}
        sourceUrl={item.sourceUrl}
        archived={item.archived}
        liked={item.liked}
        tags={item.tags.map((t: ReadItem["tags"][number]) => t.tag.name)}
        folderId={item.folderId}
        folders={folders}
      />

      <ReadArticleHeader
        title={item.title}
        author={item.author}
        siteName={item.siteName}
        sourceUrl={item.sourceUrl}
        excerpt={item.excerpt}
        contentText={item.contentText}
        createdAt={item.createdAt.toISOString()}
      />

      <ArticleReader
        itemId={item.id}
        contentHtml={item.contentHtml}
        kind={item.kind}
        embedUrl={item.embedUrl}
        itemTitle={item.title}
        initialHighlights={highlightDtos}
      />
    </ReadWorkspace>
  );
}

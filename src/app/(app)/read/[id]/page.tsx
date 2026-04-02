import { notFound } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { ArticleReader } from "@/components/article-reader";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { ReadItemDetails } from "@/components/read-item-details";
import { RegisterReadChrome } from "@/components/register-read-chrome";
import { formatSavedDate } from "@/lib/format-saved-date";

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
    <article
      className="rounded-2xl bg-[var(--reader-bg)] px-6 py-10 shadow-sm dark:shadow-none md:px-12 md:py-14"
      style={{ minHeight: "60vh" }}
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
      <header className="mb-10">
        <p className="text-sm text-[var(--reader-muted)]">
          {[item.siteName, item.author].filter(Boolean).join(" · ")}
          {(item.siteName || item.author) && (
            <>
              {" "}
              ·{" "}
            </>
          )}
          <time dateTime={item.createdAt.toISOString()} title={item.createdAt.toLocaleString()}>
            Saved {formatSavedDate(item.createdAt)}
          </time>
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold leading-tight text-[var(--reader-fg)] md:text-4xl">
          {item.title}
        </h1>
        {item.excerpt && (
          <p className="mt-4 text-lg text-[var(--reader-muted)]">{item.excerpt}</p>
        )}
      </header>
      <ReadItemDetails itemId={item.id} notes={item.notes} folderId={item.folderId} folders={folders} />
      <ArticleReader
        itemId={item.id}
        contentHtml={item.contentHtml}
        kind={item.kind}
        embedUrl={item.embedUrl}
        itemTitle={item.title}
        initialHighlights={highlightDtos}
      />
    </article>
  );
}

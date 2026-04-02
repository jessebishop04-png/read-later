import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { LibraryFilters } from "@/components/library-filters";
import { LibraryItemMenu } from "@/components/library-item-menu";
import { formatSavedDate } from "@/lib/format-saved-date";
import { buildLibraryWhere, libraryTitle, parseLibraryView } from "@/lib/library-where";

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    archived?: string;
    tag?: string;
    view?: string;
    folderId?: string;
    q?: string;
  }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const sp = await searchParams;
  let view = sp.view;
  if (sp.archived === "true") view = "archive";

  const where = buildLibraryWhere(session.user.id, {
    view,
    tag: sp.tag,
    folderId: sp.folderId,
    q: sp.q,
  });

  type LibraryRow = Prisma.SavedItemGetPayload<{
    include: {
      tags: { include: { tag: true } };
      folder: { select: { name: true } };
    };
  }>;

  let folderName: string | null = null;
  let items: LibraryRow[];
  let allTags: { name: string }[];

  try {
    items = await prisma.savedItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { tags: { include: { tag: true } }, folder: { select: { name: true } } },
    });

    allTags = await prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      select: { name: true },
    });

    if (sp.folderId) {
      const f = await prisma.folder.findFirst({
        where: { id: sp.folderId, userId: session.user.id },
        select: { name: true },
      });
      folderName = f?.name ?? null;
    }
  } catch {
    return <DbSetupNotice />;
  }

  const viewTitle = libraryTitle(parseLibraryView(view ?? undefined), null);
  const title = folderName ?? (sp.folderId && !folderName ? "Folder" : viewTitle);

  const clearSearchParams = new URLSearchParams();
  if (sp.folderId) clearSearchParams.set("folderId", sp.folderId);
  if (sp.tag?.trim()) clearSearchParams.set("tag", sp.tag.trim());
  if (sp.archived === "true") clearSearchParams.set("archived", "true");
  else if (sp.view) clearSearchParams.set("view", sp.view);
  const clearSearchHref =
    clearSearchParams.toString().length > 0
      ? `/library?${clearSearchParams.toString()}`
      : "/library";

  return (
    <div>
      <span className="sr-only">{title}</span>

      <Suspense fallback={<div className="mt-6 h-8" />}>
        <LibraryFilters tags={allTags.map((t) => t.name)} currentTag={sp.tag?.trim()} />
      </Suspense>

      {items.length === 0 ? (
        <p className="mt-12 rounded-xl border border-dashed border-stone-300 bg-stone-100/50 p-8 text-center text-stone-600 dark:border-stone-700 dark:bg-stone-900/50 dark:text-stone-400">
          {sp.q?.trim() ? (
            <>
              No saved items match your search.{" "}
              <Link
                href={clearSearchHref}
                className="font-medium text-amber-800 underline dark:text-amber-400"
              >
                Clear search
              </Link>
            </>
          ) : (
            <>
              Nothing here yet.{" "}
              <Link href="/add" className="font-medium text-amber-800 underline dark:text-amber-400">
                Save your first link
              </Link>
              .
            </>
          )}
        </p>
      ) : (
        <ul className="mt-8 space-y-3">
          {items.map((item) => (
            <li key={item.id}>
              <div className="relative flex gap-1 rounded-xl border border-stone-200 bg-white shadow-sm transition hover:border-amber-200 hover:shadow-md dark:border-stone-800 dark:bg-stone-900 dark:hover:border-amber-900/50">
                <Link href={`/read/${item.id}`} className="min-w-0 min-h-0 flex-1 p-4">
                  <div className="flex gap-4">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-16 w-28 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-amber-700 dark:text-amber-400">
                          {item.kind === "video" ? "Video" : "Article"}
                        </span>
                        {item.readAt && (
                          <span className="text-xs text-stone-400">Read</span>
                        )}
                        {item.notes?.trim() && (
                          <span
                            className="text-xs font-medium text-sky-600 dark:text-sky-400"
                            title="Has notes"
                          >
                            Notes
                          </span>
                        )}
                        {item.folder && (
                          <span className="text-xs text-stone-500 dark:text-stone-400">
                            {item.folder.name}
                          </span>
                        )}
                        <time
                          dateTime={item.createdAt.toISOString()}
                          className="text-xs text-stone-400 dark:text-stone-500"
                          title={`Added ${item.createdAt.toLocaleString()}`}
                        >
                          {formatSavedDate(item.createdAt)}
                        </time>
                      </div>
                      <h2 className="mt-1 font-serif text-lg font-semibold text-stone-900 dark:text-stone-100">
                        {item.title}
                      </h2>
                      {(item.siteName || item.excerpt) && (
                        <p className="mt-1 line-clamp-2 text-sm text-stone-600 dark:text-stone-400">
                          {item.siteName ? `${item.siteName} · ` : ""}
                          {item.excerpt}
                        </p>
                      )}
                      {item.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {item.tags.map((t: LibraryRow["tags"][number]) => (
                            <span
                              key={t.tag.id}
                              className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                            >
                              {t.tag.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
                <LibraryItemMenu
                  itemId={item.id}
                  title={item.title}
                  sourceUrl={item.sourceUrl}
                  excerpt={item.excerpt}
                  liked={item.liked}
                  archived={item.archived}
                  tagNames={item.tags.map((t: LibraryRow["tags"][number]) => t.tag.name)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

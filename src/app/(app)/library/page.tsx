import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { Suspense } from "react";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { LibraryFilters } from "@/components/library-filters";
import { LibraryItemMenu } from "@/components/library-item-menu";
import { HomeAddLinkBar } from "@/components/home-add-link-bar";
import { LibraryArticleList } from "@/components/library-article-list";
import { LibraryKindTabs } from "@/components/library-home-chrome";
import { LibraryItemGrid } from "@/components/library-item-grid";
import { formatSavedDate } from "@/lib/format-saved-date";
import { buildLibraryWhere, isKindLibraryView, libraryTitle, parseLibraryView } from "@/lib/library-where";
import { hybridSearchItemOrder } from "@/lib/semantic-search";
import { hasOpenAIKey } from "@/lib/openai-embed";
import { EmailsEmptyState } from "@/components/emails-empty-state";
import { kindLabel } from "@/lib/kind-label";

type LibraryRow = Prisma.SavedItemGetPayload<{
  include: {
    tags: { include: { tag: true } };
    folder: { select: { name: true } };
  };
}>;

export default async function LibraryPage({
  searchParams,
}: {
  searchParams: Promise<{
    archived?: string;
    tag?: string;
    view?: string;
    folderId?: string;
    q?: string;
    tab?: string;
  }>;
}) {
  const session = await safeAuth();
  if (!session?.user?.id) return null;

  const sp = await searchParams;
  let view = sp.view;
  if (sp.archived === "true") view = "archive";

  const parsedView = parseLibraryView(view ?? undefined) ?? "home";
  const isHome =
    !sp.folderId &&
    !sp.tag?.trim() &&
    !sp.q?.trim() &&
    (!view || view === "home") &&
    sp.archived !== "true" &&
    sp.tab !== "recent";
  const isRecentTab =
    !sp.folderId &&
    !sp.tag?.trim() &&
    !sp.q?.trim() &&
    (!view || view === "home") &&
    sp.archived !== "true" &&
    sp.tab === "recent";
  const isVideos = parsedView === "videos";
  const isArticles = parsedView === "articles";
  const isKindView = isKindLibraryView(parsedView);
  const isGridView = isVideos || isArticles || Boolean(sp.folderId);

  const where = buildLibraryWhere(session.user.id, {
    view,
    tag: sp.tag,
    folderId: sp.folderId,
    q: sp.q,
  });

  let folderName: string | null = null;
  let items: LibraryRow[];
  let allTags: { name: string }[];
  let snippets = new Map<string, string>();
  let searchMode: "none" | "keyword" | "semantic" = sp.q?.trim() ? "keyword" : "none";

  try {
    if (sp.q?.trim() && hasOpenAIKey()) {
      try {
        const hybrid = await hybridSearchItemOrder(session.user.id, sp.q, {
          view,
          tag: sp.tag,
          folderId: sp.folderId,
          limit: 50,
        });
        if (hybrid) {
          searchMode = "semantic";
          snippets = hybrid.snippets;
          if (hybrid.ids.length === 0) {
            items = [];
          } else {
            const rows = await prisma.savedItem.findMany({
              where: { userId: session.user.id, id: { in: hybrid.ids } },
              include: { tags: { include: { tag: true } }, folder: { select: { name: true } } },
            });
            const byId = new Map(rows.map((r) => [r.id, r]));
            items = hybrid.ids.map((id) => byId.get(id)).filter(Boolean) as LibraryRow[];
          }
        } else {
          items = await prisma.savedItem.findMany({
            where,
            orderBy: { createdAt: "desc" },
            include: { tags: { include: { tag: true } }, folder: { select: { name: true } } },
          });
        }
      } catch (e) {
        console.error("keepr: library semantic search failed", e);
        items = await prisma.savedItem.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: { tags: { include: { tag: true } }, folder: { select: { name: true } } },
        });
      }
    } else {
      items = await prisma.savedItem.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: { tags: { include: { tag: true } }, folder: { select: { name: true } } },
      });
    }

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

  const viewTitle = libraryTitle(parsedView, null);
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

  if (isHome || isRecentTab) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-4 text-2xl font-bold text-white sm:text-3xl">
          {isRecentTab ? "Recent" : "Home"}
        </h1>
        <HomeAddLinkBar />
        <LibraryArticleList
          items={items}
          emptyMessage="Nothing here yet. Add a link above to get started."
        />
      </div>
    );
  }

  const isSimpleList =
    !sp.folderId &&
    !sp.q?.trim() &&
    !sp.tag?.trim() &&
    (parsedView === "liked" ||
      parsedView === "archive" ||
      parsedView === "trash" ||
      parsedView === "notes" ||
      isKindView);

  if (isSimpleList) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="mb-6 text-2xl font-bold text-white sm:text-3xl">{viewTitle}</h1>
        {parsedView === "emails" && items.length === 0 ? (
          <EmailsEmptyState />
        ) : (
          <LibraryArticleList items={items} />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold text-white">
          {sp.q?.trim() ? "Search" : title}
        </h1>
      </div>
      {sp.q?.trim() && (
        <p className="mb-4 text-sm text-[color:var(--keepr-muted)]">
          Results for “{sp.q.trim()}”
          {searchMode === "semantic" ? " · meaning-based" : ""}
        </p>
      )}

      {(isVideos || isArticles) && !sp.folderId && !sp.q?.trim() && !isSimpleList && (
        <LibraryKindTabs
          active={isVideos ? "videos" : isArticles ? "articles" : "all"}
        />
      )}

      <Suspense fallback={<div className="mt-6 h-8" />}>
        <LibraryFilters tags={allTags.map((t) => t.name)} currentTag={sp.tag?.trim()} />
      </Suspense>

      {sp.q?.trim() && items.length === 0 ? (
        <p className="mt-12 text-center text-[color:var(--keepr-muted)]">
          No saved items match your search.{" "}
          <Link href={clearSearchHref} className="text-white underline">
            Clear search
          </Link>
        </p>
      ) : isGridView || (sp.folderId && !sp.q?.trim()) ? (
        <LibraryItemGrid items={items} />
      ) : items.length === 0 ? (
        <p className="mt-12 text-center text-[color:var(--keepr-muted)]">
          Nothing here yet.{" "}
          <Link href="/add" className="text-white underline">
            Save your first link
          </Link>
          .
        </p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <div className="relative flex gap-1 rounded-xl bg-[color:var(--keepr-elevated)] transition hover:bg-[color:var(--keepr-elevated-hover)]">
                <Link href={`/read/${item.id}`} className="min-h-0 min-w-0 flex-1 p-4">
                  <div className="flex gap-4">
                    {item.imageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[color:var(--keepr-muted)]">
                        <span className="uppercase tracking-wide">
                          {kindLabel(item.kind)}
                        </span>
                        {item.folder && <span>{item.folder.name}</span>}
                        <time dateTime={item.createdAt.toISOString()}>
                          {formatSavedDate(item.createdAt)}
                        </time>
                      </div>
                      <h2 className="mt-1 text-lg font-semibold text-white">{item.title}</h2>
                      {snippets.get(item.id) ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[color:var(--keepr-muted)]">
                          {snippets.get(item.id)}
                        </p>
                      ) : (
                        (item.siteName || item.excerpt) && (
                          <p className="mt-1 line-clamp-2 text-sm text-[color:var(--keepr-muted)]">
                            {item.siteName ? `${item.siteName} · ` : ""}
                            {item.excerpt}
                          </p>
                        )
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

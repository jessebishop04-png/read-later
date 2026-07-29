import Link from "next/link";
import { LibraryItemMenu } from "@/components/library-item-menu";
import { formatSavedDate } from "@/lib/format-saved-date";
import { kindLabel } from "@/lib/kind-label";

export type ArticleListItem = {
  id: string;
  title: string;
  sourceUrl: string;
  excerpt: string | null;
  siteName: string | null;
  imageUrl: string | null;
  kind: string;
  liked: boolean;
  archived: boolean;
  createdAt: Date;
  folder?: { name: string } | null;
  tags: { tag: { id: string; name: string } }[];
};

/** Instapaper-style vertical article list. */
export function LibraryArticleList({
  items,
  emptyMessage = "Nothing here yet.",
}: {
  items: ArticleListItem[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <p className="mt-10 text-center text-[color:var(--keepr-muted)]">{emptyMessage}</p>
    );
  }

  return (
    <ul className="divide-y divide-white/10 border-t border-white/10">
      {items.map((item) => (
        <li key={item.id} className="group relative">
          <div className="flex gap-1">
            <Link
              href={`/read/${item.id}`}
              className="min-w-0 flex-1 py-5 pr-2 transition hover:opacity-90"
            >
              <div className="flex gap-4">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold leading-snug text-white sm:text-xl">
                    {item.title}
                  </h2>
                  {(item.siteName || item.excerpt) && (
                    <p className="mt-1.5 line-clamp-2 text-[15px] leading-relaxed text-[color:var(--keepr-muted)]">
                      {item.siteName ? (
                        <span className="text-white/70">{item.siteName}</span>
                      ) : null}
                      {item.siteName && item.excerpt ? " — " : ""}
                      {item.excerpt}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[color:var(--keepr-faint)]">
                    <span className="uppercase tracking-wide">{kindLabel(item.kind)}</span>
                    {item.folder && (
                      <>
                        <span aria-hidden>·</span>
                        <span>{item.folder.name}</span>
                      </>
                    )}
                    <span aria-hidden>·</span>
                    <time dateTime={item.createdAt.toISOString()}>
                      {formatSavedDate(item.createdAt)}
                    </time>
                    {item.liked && (
                      <>
                        <span aria-hidden>·</span>
                        <span>Liked</span>
                      </>
                    )}
                  </div>
                </div>
                {item.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.imageUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="hidden h-[4.5rem] w-[4.5rem] shrink-0 rounded object-cover sm:block"
                  />
                )}
              </div>
            </Link>
            <div className="flex items-start pt-4 opacity-70 group-hover:opacity-100">
              <LibraryItemMenu
                itemId={item.id}
                title={item.title}
                sourceUrl={item.sourceUrl}
                excerpt={item.excerpt}
                liked={item.liked}
                archived={item.archived}
                tagNames={item.tags.map((t) => t.tag.name)}
              />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

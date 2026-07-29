import Link from "next/link";

export type CarouselItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  siteName: string | null;
  kind: string;
  createdAt: Date | string;
};

function yearOf(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.getFullYear();
}

export function LibraryCarousel({
  title,
  items,
  viewAllHref,
}: {
  title: string;
  items: CarouselItem[];
  viewAllHref?: string;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        {viewAllHref && (
          <Link
            href={viewAllHref}
            className="text-sm text-[color:var(--keepr-muted)] hover:text-white"
          >
            View all
          </Link>
        )}
      </div>
      <div className="scrollbar-hide -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/read/${item.id}`}
            className="w-36 shrink-0 sm:w-40"
          >
            <div className="aspect-square overflow-hidden rounded-lg bg-[color:var(--keepr-elevated)]">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition hover:opacity-90"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[color:var(--keepr-faint)]">
                  {item.kind === "video" ? "Video" : item.kind === "pdf" ? "PDF" : item.kind === "email" ? "Email" : "Article"}
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-medium text-white">{item.title}</p>
            <p className="mt-0.5 text-xs text-[color:var(--keepr-muted)]">
              {item.siteName ? `${item.siteName} · ` : ""}
              {yearOf(item.createdAt)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

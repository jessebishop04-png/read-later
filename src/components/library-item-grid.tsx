import Link from "next/link";
import { formatSavedDate } from "@/lib/format-saved-date";
import { kindLabel } from "@/lib/kind-label";

export type GridItem = {
  id: string;
  title: string;
  imageUrl: string | null;
  siteName: string | null;
  kind: string;
  createdAt: Date;
};

export function LibraryItemGrid({ items }: { items: GridItem[] }) {
  if (items.length === 0) {
    return (
      <p className="mt-8 text-center text-[color:var(--keepr-muted)]">
        Nothing here yet.{" "}
        <Link href="/add" className="text-white underline">
          Save your first link
        </Link>
        .
      </p>
    );
  }

  return (
    <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
      {items.map((item) => (
        <li key={item.id}>
          <Link href={`/read/${item.id}`} className="group block">
            <div className="aspect-square overflow-hidden rounded-lg bg-[color:var(--keepr-elevated)]">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition group-hover:opacity-90"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[color:var(--keepr-faint)]">
                  {kindLabel(item.kind)}
                </div>
              )}
            </div>
            <p className="mt-2 line-clamp-2 text-sm font-semibold text-white">{item.title}</p>
            <p className="mt-0.5 text-sm text-[color:var(--keepr-muted)]">
              {item.siteName || kindLabel(item.kind)}
            </p>
            <p className="text-xs uppercase tracking-wide text-[color:var(--keepr-faint)]">
              {formatSavedDate(item.createdAt)}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

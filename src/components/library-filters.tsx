"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Props = {
  tags: string[];
  currentTag?: string;
};

export function LibraryFilters({ tags, currentTag }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const buildUrl = (mutate: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(searchParams.toString());
    mutate(next);
    const q = next.toString();
    router.push(q ? `/library?${q}` : "/library");
  };

  const setTag = (tag: string | null) => {
    buildUrl((next) => {
      if (tag === null || tag === "") next.delete("tag");
      else next.set("tag", tag);
    });
  };

  if (tags.length === 0) return null;

  return (
    <div className="mt-6 flex flex-wrap items-center gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-stone-500">Tag:</span>
        <button
          type="button"
          onClick={() => setTag(null)}
          className={`rounded-full px-3 py-1 text-sm ${
            !currentTag
              ? "bg-amber-100 font-medium text-amber-950 dark:bg-amber-950/60 dark:text-amber-100"
              : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400"
          }`}
        >
          All tags
        </button>
        {tags.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(currentTag === t ? null : t)}
            className={`rounded-full px-3 py-1 text-sm ${
              currentTag === t
                ? "bg-amber-100 font-medium text-amber-950 dark:bg-amber-950/60 dark:text-amber-100"
                : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

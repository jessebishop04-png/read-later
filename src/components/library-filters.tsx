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
        <span className="text-sm text-[color:var(--keepr-muted)]">Tag:</span>
        <button
          type="button"
          onClick={() => setTag(null)}
          className={`rounded-full px-3 py-1 text-sm ${
            !currentTag
              ? "bg-white font-medium text-black"
              : "bg-[color:var(--keepr-elevated)] text-[color:var(--keepr-muted)] hover:text-white"
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
                ? "bg-white font-medium text-black"
                : "bg-[color:var(--keepr-elevated)] text-[color:var(--keepr-muted)] hover:text-white"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

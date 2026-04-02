"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 320;
const DROPDOWN_MIN_CHARS = 2;
const DROPDOWN_MAX = 8;

type ApiItem = {
  id: string;
  title: string;
  siteName: string | null;
  kind: string;
};

export function LibrarySearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const inputRef = useRef<HTMLInputElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [value, setValue] = useState(() => searchParams.get("q") ?? "");
  const [debounced, setDebounced] = useState(() => searchParams.get("q") ?? "");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownLoading, setDropdownLoading] = useState(false);
  const [dropdownItems, setDropdownItems] = useState<ApiItem[]>([]);

  const onLibrary = pathname.startsWith("/library");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    const el = inputRef.current;
    if (document.activeElement === el) return;
    const q = searchParams.get("q") ?? "";
    setValue(q);
    setDebounced(q);
  }, [searchParams]);

  useEffect(() => {
    if (!onLibrary) return;
    const next = new URLSearchParams(searchParams.toString());
    const t = debounced.trim();
    if (t) next.set("q", t);
    else next.delete("q");
    const nextQs = next.toString();
    if (nextQs === searchParams.toString()) return;
    router.replace(nextQs ? `/library?${nextQs}` : "/library");
  }, [debounced, onLibrary, router, searchParams]);

  const buildItemsUrl = useCallback(
    (q: string) => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      return `/api/items?${p.toString()}`;
    },
    []
  );

  useEffect(() => {
    if (onLibrary) {
      setDropdownOpen(false);
      setDropdownItems([]);
      return;
    }
    const q = debounced.trim();
    if (q.length < DROPDOWN_MIN_CHARS) {
      setDropdownItems([]);
      setDropdownLoading(false);
      setDropdownOpen(false);
      return;
    }
    const ac = new AbortController();
    setDropdownLoading(true);
    setDropdownOpen(true);
    void fetch(buildItemsUrl(q), { credentials: "include", signal: ac.signal })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json() as Promise<{ items?: ApiItem[] }>;
      })
      .then((data) => {
        setDropdownItems((data.items ?? []).slice(0, DROPDOWN_MAX));
      })
      .catch(() => {
        if (!ac.signal.aborted) setDropdownItems([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setDropdownLoading(false);
      });
    return () => ac.abort();
  }, [debounced, buildItemsUrl, onLibrary]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const close = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [dropdownOpen]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(searchParams.toString());
    const trimmed = value.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    const qs = next.toString();
    router.push(qs ? `/library?${qs}` : "/library");
    setDropdownOpen(false);
  };

  const flushDebounceOnBlur = () => {
    if (onLibrary) setDebounced(value);
  };

  const libraryHrefWithQ = () => {
    const next = new URLSearchParams(searchParams.toString());
    const trimmed = debounced.trim();
    if (trimmed) next.set("q", trimmed);
    else next.delete("q");
    const qs = next.toString();
    return qs ? `/library?${qs}` : "/library";
  };

  return (
    <div ref={rootRef} className="relative mx-auto w-full max-w-md">
      <form
        onSubmit={submit}
        className="flex w-full items-center gap-2"
        role="search"
      >
        <label htmlFor="library-search" className="sr-only">
          Search saved items
        </label>
        <input
          ref={inputRef}
          id="library-search"
          type="search"
          name="q"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            if (!onLibrary && e.target.value.trim().length >= DROPDOWN_MIN_CHARS) {
              setDropdownOpen(true);
            }
          }}
          onFocus={() => {
            if (!onLibrary && debounced.trim().length >= DROPDOWN_MIN_CHARS) {
              setDropdownOpen(true);
            }
          }}
          onBlur={flushDebounceOnBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") setDropdownOpen(false);
          }}
          placeholder="Search saved…"
          autoComplete="off"
          className="min-w-0 flex-1 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm text-stone-900 placeholder:text-stone-400 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-stone-200 px-3 py-1.5 text-sm font-medium text-stone-800 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-100 dark:hover:bg-stone-600"
        >
          Search
        </button>
      </form>

      {!onLibrary && dropdownOpen && (debounced.trim().length >= DROPDOWN_MIN_CHARS || dropdownLoading) && (
        <div
          className="absolute left-0 right-12 top-full z-50 mt-1 max-h-80 overflow-auto rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
          role="listbox"
          aria-label="Matching saved items"
        >
          {dropdownLoading && (
            <p className="px-3 py-2 text-sm text-stone-500 dark:text-stone-400">Searching…</p>
          )}
          {!dropdownLoading && dropdownItems.length === 0 && (
            <p className="px-3 py-2 text-sm text-stone-500 dark:text-stone-400">No matches</p>
          )}
          {!dropdownLoading &&
            dropdownItems.map((item) => (
              <Link
                key={item.id}
                href={`/read/${item.id}`}
                role="option"
                className="block px-3 py-2 text-left text-sm hover:bg-stone-100 dark:hover:bg-stone-800"
                onClick={() => setDropdownOpen(false)}
              >
                <span className="line-clamp-1 font-medium text-stone-900 dark:text-stone-100">
                  {item.title}
                </span>
                <span className="mt-0.5 line-clamp-1 text-xs text-stone-500 dark:text-stone-400">
                  {item.kind === "video" ? "Video" : "Article"}
                  {item.siteName ? ` · ${item.siteName}` : ""}
                </span>
              </Link>
            ))}
          {!dropdownLoading && debounced.trim().length >= DROPDOWN_MIN_CHARS && (
            <Link
              href={libraryHrefWithQ()}
              className="block border-t border-stone-200 px-3 py-2 text-center text-sm font-medium text-amber-800 dark:border-stone-700 dark:text-amber-400"
              onClick={() => setDropdownOpen(false)}
            >
              See all in library
            </Link>
          )}
        </div>
      )}
    </div>
  );
}

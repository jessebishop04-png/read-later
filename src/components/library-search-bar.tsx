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
  matchSnippet?: string;
};

type Props = {
  /** Unique id when multiple search bars are mounted (desktop sidebar + mobile header). */
  inputId?: string;
};

export function LibrarySearchBar({ inputId = "library-search" }: Props) {
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
    <div ref={rootRef} className="relative w-full">
      <form
        onSubmit={submit}
        className="flex w-full items-center"
        role="search"
      >
        <label htmlFor={inputId} className="sr-only">
          Search saved items
        </label>
        <div className="relative w-full">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--keepr-faint)]"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M11 18a7 7 0 100-14 7 7 0 000 14z"
            />
          </svg>
          <input
            ref={inputRef}
            id={inputId}
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
            placeholder="Search by meaning…"
            autoComplete="off"
            className="w-full rounded-full border-0 bg-[color:var(--keepr-elevated)] py-2 pl-9 pr-3 text-sm text-white placeholder:text-[color:var(--keepr-faint)] focus:outline-none focus:ring-1 focus:ring-white/20"
          />
        </div>
      </form>

      {!onLibrary && dropdownOpen && (debounced.trim().length >= DROPDOWN_MIN_CHARS || dropdownLoading) && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-auto rounded-xl border border-white/10 bg-[color:var(--keepr-elevated)] py-1 shadow-lg md:left-0 md:right-auto md:w-[min(22rem,calc(100vw-4rem))]"
          role="listbox"
          aria-label="Matching saved items"
        >
          {dropdownLoading && (
            <p className="px-3 py-2 text-sm text-[color:var(--keepr-muted)]">Searching…</p>
          )}
          {!dropdownLoading && dropdownItems.length === 0 && (
            <p className="px-3 py-2 text-sm text-[color:var(--keepr-muted)]">No matches</p>
          )}
          {!dropdownLoading &&
            dropdownItems.map((item) => (
              <Link
                key={item.id}
                href={`/read/${item.id}`}
                role="option"
                className="block px-3 py-2 text-left text-sm hover:bg-white/5"
                onClick={() => setDropdownOpen(false)}
              >
                <span className="line-clamp-1 font-medium text-white">{item.title}</span>
                <span className="mt-0.5 line-clamp-1 text-xs text-[color:var(--keepr-muted)]">
                  {item.kind === "video" ? "Video" : item.kind === "pdf" ? "PDF" : item.kind === "email" ? "Email" : "Article"}
                  {item.siteName ? ` · ${item.siteName}` : ""}
                </span>
                {item.matchSnippet && (
                  <span className="mt-0.5 line-clamp-2 text-xs text-[color:var(--keepr-faint)]">
                    {item.matchSnippet}
                  </span>
                )}
              </Link>
            ))}
          {!dropdownLoading && debounced.trim().length >= DROPDOWN_MIN_CHARS && (
            <Link
              href={libraryHrefWithQ()}
              className="block border-t border-white/10 px-3 py-2 text-center text-sm font-medium text-white"
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

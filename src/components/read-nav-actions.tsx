"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useOptionalReadChrome } from "@/components/read-chrome-context";

function openShareEmail(title: string, sourceUrl: string, itemId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const readUrl = `${origin}/read/${itemId}`;
  const subject = encodeURIComponent(`Saved: ${title}`);
  const body = encodeURIComponent(
    `${title}\n\nOriginal: ${sourceUrl}\n\nOpen in Read Later: ${readUrl}`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

const iconBtn =
  "inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-stone-600 hover:bg-stone-100 disabled:opacity-50 dark:text-stone-300 dark:hover:bg-stone-800";

export function ReadNavActions() {
  const ctx = useOptionalReadChrome();
  const router = useRouter();
  const [tagsOpen, setTagsOpen] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  const chrome = ctx?.chrome ?? null;
  const [liked, setLiked] = useState(false);
  const [archived, setArchived] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!chrome) return;
    setLiked(chrome.liked);
    setArchived(chrome.archived);
    setTagInput(chrome.tags.join(", "));
  }, [chrome]);

  useEffect(() => {
    if (!tagsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (popRef.current && !popRef.current.contains(e.target as Node)) {
        setTagsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [tagsOpen]);

  const patch = useCallback(
    async (itemId: string, body: object) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        if (res.ok) router.refresh();
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  if (!chrome) return null;

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    void (async () => {
      const res = await fetch(`/api/items/${chrome.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ liked: next }),
      });
      if (!res.ok) setLiked(!next);
      else router.refresh();
    })();
  };

  const toggleArchive = () => {
    const next = !archived;
    setArchived(next);
    void (async () => {
      const res = await fetch(`/api/items/${chrome.itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ archived: next }),
      });
      if (!res.ok) setArchived(!next);
      else router.refresh();
    })();
  };

  const saveTags = () => {
    const list = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    void patch(chrome.itemId, { tags: list }).then(() => setTagsOpen(false));
  };

  const likedRing = liked
    ? "text-rose-600 ring-1 ring-rose-300 dark:text-rose-400 dark:ring-rose-800"
    : "";

  return (
    <div className="flex items-center gap-0.5 sm:gap-1">
      <a
        href={chrome.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={iconBtn}
        title="Open original in new tab"
        aria-label="Open original in new tab"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
          />
        </svg>
      </a>

      <button
        type="button"
        disabled={busy}
        onClick={toggleLike}
        className={`${iconBtn} ${likedRing}`}
        title={liked ? "Remove from liked" : "Like"}
        aria-label={liked ? "Remove from liked" : "Like"}
        aria-pressed={liked}
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
          {liked ? (
            <path
              fill="currentColor"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          ) : (
            <path
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
            />
          )}
        </svg>
      </button>

      <div className="relative" ref={popRef}>
        <button
          type="button"
          disabled={busy}
          onClick={() => setTagsOpen((o) => !o)}
          className={iconBtn}
          title="Tags"
          aria-label="Tags"
          aria-expanded={tagsOpen}
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
        </button>
        {tagsOpen && (
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900">
            <label className="text-xs font-medium uppercase tracking-wide text-stone-500">Tags</label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm dark:border-stone-600 dark:bg-stone-950"
              placeholder="comma separated"
            />
            <button
              type="button"
              disabled={busy}
              onClick={saveTags}
              className="mt-2 w-full rounded-lg bg-amber-700 py-1.5 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600"
            >
              Save tags
            </button>
          </div>
        )}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={toggleArchive}
        className={`${iconBtn} ${archived ? "text-amber-800 ring-1 ring-amber-300 dark:text-amber-200 dark:ring-amber-800" : ""}`}
        title={archived ? "Unarchive" : "Archive"}
        aria-label={archived ? "Unarchive" : "Archive"}
        aria-pressed={archived}
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
      </button>

      <button
        type="button"
        disabled={busy}
        onClick={() => openShareEmail(chrome.title, chrome.sourceUrl, chrome.itemId)}
        className={iconBtn}
        title="Share by email"
        aria-label="Share by email"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
          />
        </svg>
      </button>
    </div>
  );
}

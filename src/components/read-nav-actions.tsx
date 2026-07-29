"use client";

import gsap from "gsap";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useOptionalReadChrome } from "@/components/read-chrome-context";
import { useOptionalTts } from "@/components/tts-context";
import { IconArchive, IconFolder, IconHeart, IconHeartSolid, IconMore, IconTag } from "@/components/ui-icons";

function openShareEmail(title: string, sourceUrl: string, itemId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const readUrl = `${origin}/read/${itemId}`;
  const subject = encodeURIComponent(`Saved: ${title}`);
  const body = encodeURIComponent(
    `${title}\n\nOriginal: ${sourceUrl}\n\nOpen in Keepr: ${readUrl}`
  );
  window.location.href = `mailto:?subject=${subject}&body=${body}`;
}

const iconBtn =
  "inline-flex shrink-0 items-center justify-center rounded-lg p-2 text-[color:var(--keepr-muted)] hover:bg-[color:var(--keepr-elevated)] hover:text-white disabled:opacity-50";

const menuRow =
  "flex w-full items-center justify-between gap-6 px-3 py-2 text-left text-[13px] text-white hover:bg-white/5 disabled:opacity-50";

const menuShortcut = "shrink-0 text-[11px] tabular-nums text-[color:var(--keepr-faint)]";

type Popover = "menu" | "tags" | "folder" | null;

export function ReadNavActions() {
  const ctx = useOptionalReadChrome();
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const menuPanelRef = useRef<HTMLDivElement>(null);
  const menuItemsRef = useRef<HTMLDivElement>(null);

  const chrome = ctx?.chrome ?? null;
  const setRightPanelOpen = ctx?.setRightPanelOpen;
  const [liked, setLiked] = useState(false);
  const [archived, setArchived] = useState(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [popover, setPopover] = useState<Popover>(null);

  const tts = useOptionalTts();

  useEffect(() => {
    if (!chrome) return;
    setLiked(chrome.liked);
    setArchived(chrome.archived);
    setFolderId(chrome.folderId);
    setTagInput(chrome.tags.join(", "));
  }, [chrome]);

  useEffect(() => {
    if (!popover) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPopover(null);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPopover(null);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [popover]);

  useLayoutEffect(() => {
    const panel = menuPanelRef.current;
    const itemsRoot = menuItemsRef.current;
    if (popover !== "menu" || !panel) return;

    const items = itemsRoot ? Array.from(itemsRoot.querySelectorAll("[data-menu-item]")) : [];
    gsap.killTweensOf([panel, ...items]);
    gsap.fromTo(
      panel,
      { autoAlpha: 0, y: -6, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.22, ease: "power2.out", transformOrigin: "top right" }
    );
    if (items.length) {
      gsap.fromTo(
        items,
        { autoAlpha: 0, x: 8 },
        { autoAlpha: 1, x: 0, duration: 0.18, stagger: 0.018, delay: 0.04, ease: "power2.out" }
      );
    }
  }, [popover]);

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
        return res.ok;
      } finally {
        setBusy(false);
      }
    },
    [router]
  );

  if (!chrome) return null;

  const closePopover = () => setPopover(null);

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
    void patch(chrome.itemId, { tags: list }).then(() => closePopover());
  };

  const moveToFolder = (nextId: string | null) => {
    setFolderId(nextId);
    void patch(chrome.itemId, { folderId: nextId }).then(() => closePopover());
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(chrome.sourceUrl);
    } catch {
      /* ignore */
    }
    closePopover();
  };

  const deleteItem = async () => {
    if (!confirm("Remove this item from your library?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${chrome.itemId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) router.push("/library");
    } finally {
      setBusy(false);
      closePopover();
    }
  };

  const openPanelTab = (tab: "info" | "notebook" | "chat") => {
    closePopover();
    setRightPanelOpen?.(true);
    window.dispatchEvent(new CustomEvent("keepr:read-panel-tab", { detail: tab }));
  };

  const likedRing = liked
    ? "text-rose-600 ring-1 ring-rose-300 dark:text-rose-400 dark:ring-rose-800"
    : "";

  return (
    <div ref={rootRef} className="relative flex items-center gap-0.5 sm:gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={toggleLike}
        className={`${iconBtn} ${likedRing}`}
        title={liked ? "Remove from liked" : "Like"}
        aria-label={liked ? "Remove from liked" : "Like"}
        aria-pressed={liked}
      >
        {liked ? <IconHeartSolid className="h-5 w-5" /> : <IconHeart className="h-5 w-5" />}
      </button>

      <div className="relative">
        <button
          type="button"
          disabled={busy}
          onClick={() => setPopover((p) => (p === "tags" ? null : "tags"))}
          className={`${iconBtn} ${popover === "tags" ? "bg-[color:var(--keepr-elevated)] text-white" : ""}`}
          title="Tags"
          aria-label="Tags"
          aria-expanded={popover === "tags"}
        >
          <IconTag className="h-5 w-5" />
        </button>
        {popover === "tags" ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-xl bg-[color:var(--keepr-elevated)] p-3 shadow-xl ring-1 ring-white/10">
            <label className="text-xs font-medium uppercase tracking-wide text-[color:var(--keepr-faint)]">
              Tags
            </label>
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="mt-1 w-full rounded-lg border-0 bg-[color:var(--keepr-pill)] px-2 py-1.5 text-sm text-white placeholder:text-[color:var(--keepr-faint)] focus:outline-none focus:ring-1 focus:ring-white/20"
              placeholder="comma separated"
              autoFocus
            />
            <button
              type="button"
              disabled={busy}
              onClick={saveTags}
              className="mt-2 w-full rounded-lg bg-white py-1.5 text-sm font-semibold text-black hover:bg-neutral-200"
            >
              Save tags
            </button>
          </div>
        ) : null}
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={toggleArchive}
        className={`${iconBtn} ${archived ? "text-white ring-1 ring-white/30" : ""}`}
        title={archived ? "Unarchive" : "Archive"}
        aria-label={archived ? "Unarchive" : "Archive"}
        aria-pressed={archived}
      >
        <IconArchive className="h-5 w-5" />
      </button>

      <div className="relative">
        <button
          type="button"
          disabled={busy}
          onClick={() => setPopover((p) => (p === "folder" ? null : "folder"))}
          className={`${iconBtn} ${popover === "folder" ? "bg-[color:var(--keepr-elevated)] text-white" : ""}`}
          title="Move to folder"
          aria-label="Move to folder"
          aria-expanded={popover === "folder"}
        >
          <IconFolder className="h-5 w-5" />
        </button>
        {popover === "folder" ? (
          <div className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl bg-[color:var(--keepr-elevated)] py-1.5 shadow-xl ring-1 ring-white/10">
            <p className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--keepr-faint)]">
              Move to folder
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => moveToFolder(null)}
              className={`${menuRow} ${folderId === null ? "bg-white/5" : ""}`}
            >
              No folder
            </button>
            {chrome.folders.map((f) => (
              <button
                key={f.id}
                type="button"
                disabled={busy}
                onClick={() => moveToFolder(f.id)}
                className={`${menuRow} ${folderId === f.id ? "bg-white/5" : ""}`}
              >
                <span className="truncate">{f.name}</span>
              </button>
            ))}
            {chrome.folders.length === 0 ? (
              <p className="px-3 py-2 text-[12px] text-[color:var(--keepr-faint)]">
                Create folders from the side menu.
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* More actions — right of the quick action icons */}
      <div className="relative">
        <button
          type="button"
          disabled={busy}
          onClick={() => setPopover((p) => (p === "menu" ? null : "menu"))}
          className={`${iconBtn} ${popover === "menu" ? "bg-[color:var(--keepr-elevated)] text-white" : ""}`}
          title="More actions"
          aria-label="More actions"
          aria-expanded={popover === "menu"}
          aria-haspopup="menu"
        >
          <IconMore className="h-5 w-5" />
        </button>

        {popover === "menu" ? (
          <div
            ref={menuPanelRef}
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-[min(100vw-2rem,17.5rem)] origin-top-right rounded-xl bg-[color:var(--keepr-elevated)] py-1.5 shadow-xl ring-1 ring-white/10"
            style={{ opacity: 0 }}
          >
            <div ref={menuItemsRef}>
              <button
                type="button"
                data-menu-item
                role="menuitem"
                className={menuRow}
                onClick={() => setPopover("tags")}
              >
                <span>Add document tag</span>
                <span className={menuShortcut}>⇧ T</span>
              </button>
              <button
                type="button"
                data-menu-item
                role="menuitem"
                className={menuRow}
                onClick={() => openPanelTab("notebook")}
              >
                <span>Add document note</span>
                <span className={menuShortcut}>⇧ N</span>
              </button>
              <button
                type="button"
                data-menu-item
                role="menuitem"
                className={menuRow}
                onClick={() => {
                  closePopover();
                  tts?.start();
                }}
              >
                <span>Start text-to-speech</span>
                <span className={menuShortcut}>P</span>
              </button>

              <div data-menu-item className="my-1.5 border-t border-white/10" role="separator" />

              <button
                type="button"
                data-menu-item
                role="menuitem"
                className={menuRow}
                onClick={() => openPanelTab("info")}
              >
                <span>Edit metadata</span>
                <span className={menuShortcut}>⇧ M</span>
              </button>
              <button
                type="button"
                data-menu-item
                role="menuitem"
                disabled={busy}
                className={menuRow}
                onClick={() => {
                  void patch(chrome.itemId, { markUnread: true }).then(closePopover);
                }}
              >
                <span>Reset reading progress</span>
                <span className={menuShortcut}>⇧ R</span>
              </button>

              <div data-menu-item className="my-1.5 border-t border-white/10" role="separator" />

              <a
                data-menu-item
                role="menuitem"
                href={chrome.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={menuRow}
                onClick={closePopover}
              >
                <span>Open original</span>
                <span className={menuShortcut}>O</span>
              </a>
              <button
                type="button"
                data-menu-item
                role="menuitem"
                className={menuRow}
                onClick={() => void copyUrl()}
              >
                <span>Copy document URL</span>
                <span className={menuShortcut}>⇧ C</span>
              </button>
              <button
                type="button"
                data-menu-item
                role="menuitem"
                className={menuRow}
                onClick={() => openShareEmail(chrome.title, chrome.sourceUrl, chrome.itemId)}
              >
                <span>Share by email</span>
              </button>
              <button
                type="button"
                data-menu-item
                role="menuitem"
                className={menuRow}
                disabled
                title="Coming soon"
              >
                <span className="inline-flex items-center gap-2 text-[color:var(--keepr-muted)]">
                  Enable public link
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold">
                    i
                  </span>
                </span>
                <span className={menuShortcut}>Alt S</span>
              </button>

              <div data-menu-item className="my-1.5 border-t border-white/10" role="separator" />

              <button
                type="button"
                data-menu-item
                role="menuitem"
                className={menuRow}
                onClick={() => {
                  closePopover();
                  window.print();
                }}
              >
                <span>Print with annotations</span>
                <span className={menuShortcut}>⌘ P</span>
              </button>

              <div data-menu-item className="my-1.5 border-t border-white/10" role="separator" />

              <button
                type="button"
                data-menu-item
                role="menuitem"
                disabled={busy}
                className={`${menuRow} text-rose-400 hover:bg-rose-500/10 hover:text-rose-300`}
                onClick={() => void deleteItem()}
              >
                <span>Delete document</span>
                <span className={`${menuShortcut} text-rose-400/70`}>D</span>
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}


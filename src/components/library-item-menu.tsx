"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { isLikelyHttpUrl, normalizeUrlInput } from "@/lib/normalize-url";
import {
  IconArchive,
  IconArrowUturn,
  IconCheck,
  IconHeart,
  IconHeartSolid,
  IconPencil,
  IconPlusSmall,
  IconTag,
  IconTrash,
  IconX,
} from "@/components/ui-icons";

type Props = {
  itemId: string;
  title: string;
  sourceUrl: string;
  excerpt: string | null;
  liked: boolean;
  archived: boolean;
  tagNames: string[];
};

const menuBtn =
  "rounded-lg p-2 text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100";

const menuItem =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-stone-800 hover:bg-stone-100 dark:text-stone-100 dark:hover:bg-stone-800";

const menuIcon = "h-4 w-4 shrink-0 opacity-90";

const modalTitleIcon =
  "h-5 w-5 shrink-0 text-amber-800 opacity-95 dark:text-amber-400";

const btnIcon = "h-4 w-4 shrink-0";

const modalOverlay =
  "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px] dark:bg-black/60";

const modalPanel =
  "max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900";

export function LibraryItemMenu({
  itemId,
  title: initialTitle,
  sourceUrl: initialSourceUrl,
  excerpt: initialExcerpt,
  liked,
  archived,
  tagNames,
}: Props) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [tagOpen, setTagOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editTitle, setEditTitle] = useState(initialTitle);
  const [editUrl, setEditUrl] = useState(initialSourceUrl);
  const [editExcerpt, setEditExcerpt] = useState(initialExcerpt ?? "");
  const [editError, setEditError] = useState<string | null>(null);

  const [tagInput, setTagInput] = useState("");

  const closeMenu = useCallback(() => {
    setMenuOpen(false);
  }, []);

  const closeEdit = useCallback(() => {
    setEditOpen(false);
    setEditError(null);
  }, []);

  const closeTag = useCallback(() => {
    setTagOpen(false);
    setTagInput("");
  }, []);

  useEffect(() => {
    if (editOpen) {
      setEditTitle(initialTitle);
      setEditUrl(initialSourceUrl);
      setEditExcerpt(initialExcerpt ?? "");
      setEditError(null);
    }
  }, [editOpen, initialTitle, initialSourceUrl, initialExcerpt]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen, closeMenu]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (editOpen) {
        e.preventDefault();
        closeEdit();
        return;
      }
      if (tagOpen) {
        e.preventDefault();
        closeTag();
        return;
      }
      if (menuOpen) closeMenu();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editOpen, tagOpen, menuOpen, closeEdit, closeTag, closeMenu]);

  const patch = async (body: object) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (res.ok) router.refresh();
      return res;
    } finally {
      setBusy(false);
    }
  };

  const toggleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void (async () => {
      await patch({ liked: !liked });
      closeMenu();
    })();
  };

  const toggleArchive = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void (async () => {
      await patch({ archived: !archived });
      closeMenu();
    })();
  };

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const t = editTitle.trim();
    if (!t) {
      setEditError("Title cannot be empty.");
      return;
    }
    const normalized = normalizeUrlInput(editUrl);
    if (!normalized || !isLikelyHttpUrl(normalized)) {
      setEditError("Enter a valid http(s) URL.");
      return;
    }
    void (async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            title: t,
            sourceUrl: normalized,
            excerpt: editExcerpt.trim() === "" ? null : editExcerpt.trim(),
          }),
        });
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        if (!res.ok) {
          setEditError(typeof data.error === "string" ? data.error : "Could not save");
          return;
        }
        router.refresh();
        closeEdit();
      } finally {
        setBusy(false);
      }
    })();
  };

  const submitTag = (e: React.FormEvent) => {
    e.preventDefault();
    const t = tagInput.trim();
    if (!t || busy) return;
    const lower = new Set(tagNames.map((x) => x.toLowerCase()));
    if (lower.has(t.toLowerCase())) {
      closeTag();
      return;
    }
    void (async () => {
      const res = await patch({ tags: [...tagNames, t] });
      if (res?.ok) closeTag();
    })();
  };

  const remove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Remove this item from your library?")) return;
    void (async () => {
      setBusy(true);
      try {
        const res = await fetch(`/api/items/${itemId}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (res.ok) router.refresh();
      } finally {
        setBusy(false);
        closeMenu();
      }
    })();
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const editModal =
    editOpen &&
    mounted &&
    createPortal(
      <div
        className={modalOverlay}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeEdit();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`edit-dialog-title-${itemId}`}
          className={modalPanel}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2
            id={`edit-dialog-title-${itemId}`}
            className="flex items-center gap-2.5 font-serif text-xl font-semibold text-stone-900 dark:text-stone-100"
          >
            <IconPencil className={modalTitleIcon} />
            Edit
          </h2>
          <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
            Updating the URL does not reload the saved article text.
          </p>
          <form className="mt-4 flex flex-col gap-3" onSubmit={saveEdit}>
            <div>
              <label htmlFor={`modal-title-${itemId}`} className="text-xs font-medium text-stone-500">
                Title
              </label>
              <input
                id={`modal-title-${itemId}`}
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-950"
              />
            </div>
            <div>
              <label htmlFor={`modal-url-${itemId}`} className="text-xs font-medium text-stone-500">
                Source URL
              </label>
              <input
                id={`modal-url-${itemId}`}
                type="url"
                value={editUrl}
                onChange={(e) => setEditUrl(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-950"
                placeholder="https://"
              />
            </div>
            <div>
              <label htmlFor={`modal-excerpt-${itemId}`} className="text-xs font-medium text-stone-500">
                Description
              </label>
              <textarea
                id={`modal-excerpt-${itemId}`}
                value={editExcerpt}
                onChange={(e) => setEditExcerpt(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-950"
                placeholder="Optional"
              />
            </div>
            {editError && (
              <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                {editError}
              </p>
            )}
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600"
              >
                <IconCheck className={btnIcon} />
                Save
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={closeEdit}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-stone-600"
              >
                <IconX className={btnIcon} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );

  const tagModal =
    tagOpen &&
    mounted &&
    createPortal(
      <div
        className={modalOverlay}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) closeTag();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={`tag-dialog-title-${itemId}`}
          className={modalPanel}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2
            id={`tag-dialog-title-${itemId}`}
            className="flex items-center gap-2.5 font-serif text-xl font-semibold text-stone-900 dark:text-stone-100"
          >
            <IconTag className={modalTitleIcon} />
            Add tag
          </h2>
          {tagNames.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {tagNames.map((name) => (
                <span
                  key={name}
                  className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-400"
                >
                  {name}
                </span>
              ))}
            </div>
          )}
          <form className="mt-4 flex flex-col gap-3" onSubmit={submitTag}>
            <div>
              <label htmlFor={`modal-tag-${itemId}`} className="text-xs font-medium text-stone-500">
                New tag
              </label>
              <input
                id={`modal-tag-${itemId}`}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="Tag name"
                className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-950"
                autoFocus
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                disabled={busy || !tagInput.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600"
              >
                <IconPlusSmall className={btnIcon} />
                Add tag
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={closeTag}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-stone-600"
              >
                <IconX className={btnIcon} />
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>,
      document.body
    );

  return (
    <div ref={rootRef} className="relative shrink-0 self-start pt-2 pr-2">
      {editModal}
      {tagModal}

      <button
        type="button"
        className={menuBtn}
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label="Item actions"
        disabled={busy && !menuOpen && !editOpen && !tagOpen}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenuOpen((o) => !o);
        }}
      >
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 8a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
        </svg>
      </button>

      {menuOpen && (
        <div
          className="absolute right-0 top-full z-50 mt-0.5 min-w-[12rem] rounded-lg border border-stone-200 bg-white py-1 shadow-lg dark:border-stone-700 dark:bg-stone-900"
          role="menu"
          aria-label="Saved item actions"
        >
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeMenu();
              setEditOpen(true);
            }}
          >
            <IconPencil className={menuIcon} />
            Edit
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={busy}
            onClick={toggleLike}
          >
            {liked ? <IconHeartSolid className={menuIcon} /> : <IconHeart className={menuIcon} />}
            {liked ? "Unlike" : "Like"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={busy}
            onClick={toggleArchive}
          >
            {archived ? <IconArrowUturn className={menuIcon} /> : <IconArchive className={menuIcon} />}
            {archived ? "Unarchive" : "Archive"}
          </button>
          <button
            type="button"
            role="menuitem"
            className={menuItem}
            disabled={busy}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closeMenu();
              setTagOpen(true);
            }}
          >
            <IconTag className={menuIcon} />
            Add tag
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${menuItem} text-red-700 dark:text-red-400`}
            disabled={busy}
            onClick={remove}
          >
            <IconTrash className={menuIcon} />
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

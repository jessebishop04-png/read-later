"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type FolderOpt = { id: string; name: string };

type Props = {
  itemId: string;
  sourceUrl: string;
  archived: boolean;
  tags: string[];
  liked: boolean;
  notes: string | null;
  folderId: string | null;
  folders: FolderOpt[];
};

export function ReadToolbar({
  itemId,
  sourceUrl,
  archived,
  tags,
  liked: initialLiked,
  notes: initialNotes,
  folderId: initialFolderId,
  folders,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [tagInput, setTagInput] = useState(tags.join(", "));
  const [liked, setLiked] = useState(initialLiked);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [notesSaved, setNotesSaved] = useState(false);
  const [folderId, setFolderId] = useState(initialFolderId ?? "");

  useEffect(() => {
    setTagInput(tags.join(", "));
  }, [tags]);

  useEffect(() => {
    setLiked(initialLiked);
  }, [initialLiked]);

  useEffect(() => {
    setNotes(initialNotes ?? "");
  }, [initialNotes]);

  useEffect(() => {
    setFolderId(initialFolderId ?? "");
  }, [initialFolderId]);

  useEffect(() => {
    void fetch(`/api/items/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ markRead: true }),
    });
  }, [itemId]);

  const patch = async (body: object) => {
    setBusy(true);
    try {
      await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const saveTags = () => {
    const list = tagInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    void patch({ tags: list });
  };

  const toggleLike = () => {
    const next = !liked;
    setLiked(next);
    void (async () => {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ liked: next }),
      });
      if (!res.ok) setLiked(!next);
      else router.refresh();
    })();
  };

  const saveNotes = () => {
    setNotesSaved(false);
    void (async () => {
      await patch({ notes: notes.trim() === "" ? null : notes });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 2000);
    })();
  };

  const applyFolder = () => {
    void patch({ folderId: folderId === "" ? null : folderId });
  };

  const remove = async () => {
    if (!confirm("Remove this item from your library?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/items/${itemId}`, { method: "DELETE" });
      if (res.ok) router.push("/library");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mb-8 flex flex-col gap-6 border-b border-stone-200 pb-8 dark:border-stone-800">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={toggleLike}
          disabled={busy}
          className={`rounded-lg border px-3 py-2 text-sm font-medium ${
            liked
              ? "border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-200"
              : "border-stone-300 text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-900"
          }`}
        >
          {liked ? "Liked" : "Like"}
        </button>
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-900"
        >
          Original
        </a>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ archived: !archived })}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-900"
        >
          {archived ? "Unarchive" : "Archive"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => patch({ markUnread: true })}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-900"
        >
          Mark unread
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
        >
          Delete
        </button>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-stone-500">Folder</label>
        <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900 sm:max-w-xs"
          >
            <option value="">No folder</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={busy}
            onClick={applyFolder}
            className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900 dark:bg-stone-700"
          >
            Save folder
          </button>
        </div>
        <p className="mt-1 text-xs text-stone-500">Create folders from the side menu.</p>
      </div>

      <div>
        <label className="text-xs font-medium uppercase tracking-wide text-stone-500">Your notes</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          placeholder="Thoughts, quotes, reminders…"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={saveNotes}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600"
          >
            Save notes
          </button>
          {notesSaved && <span className="text-xs text-green-600 dark:text-green-400">Saved</span>}
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="text-xs font-medium uppercase tracking-wide text-stone-500">Tags</label>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
            placeholder="comma separated"
          />
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={saveTags}
          className="rounded-lg bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600"
        >
          Save tags
        </button>
      </div>
    </div>
  );
}

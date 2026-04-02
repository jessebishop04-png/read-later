"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type HighlightDto = {
  id: string;
  paragraphId: number;
  startInParagraph: number;
  endInParagraph: number;
  quotedText: string;
  color: string;
  note: string | null;
};

type Props = {
  itemId: string;
  contentHtml: string;
  kind: string;
  embedUrl: string | null;
  /** Saved item title — used as the iframe accessible name for embedded video. */
  itemTitle?: string;
  initialHighlights: HighlightDto[];
};

const HL_CLASS: Record<string, string> = {
  amber: "hl-amber",
  green: "hl-green",
  blue: "hl-blue",
  rose: "hl-rose",
};

const modalOverlay =
  "fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[1px] dark:bg-black/60";

const modalPanel =
  "max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-stone-200 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900";

function textLengthBeforeNode(block: HTMLElement, target: Node, targetOffset: number): number {
  let len = 0;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let n: Node | null;
  while ((n = walker.nextNode())) {
    if (n === target) {
      return len + targetOffset;
    }
    len += n.textContent?.length ?? 0;
  }
  return len;
}

function wrapRangeInBlock(
  block: HTMLElement,
  start: number,
  end: number,
  className: string,
  highlightId: string,
  hasNote: boolean
): boolean {
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let acc = 0;
  let startNode: Node | null = null;
  let endNode: Node | null = null;
  let startOff = 0;
  let endOff = 0;
  let n: Node | null;

  while ((n = walker.nextNode())) {
    const text = n.textContent ?? "";
    const nodeLen = text.length;
    const nodeStart = acc;
    const nodeEnd = acc + nodeLen;

    if (startNode === null && start < nodeEnd) {
      startNode = n;
      startOff = Math.max(0, start - nodeStart);
    }
    if (startNode !== null && end <= nodeEnd) {
      endNode = n;
      endOff = Math.max(0, end - nodeStart);
      break;
    }
    acc += nodeLen;
  }

  if (!startNode || !endNode) return false;

  try {
    const range = document.createRange();
    range.setStart(startNode, startOff);
    range.setEnd(endNode, endOff);
    const mark = document.createElement("mark");
    mark.className = className;
    mark.setAttribute("data-highlight-id", highlightId);
    mark.setAttribute("data-has-note", hasNote ? "true" : "false");
    mark.title = hasNote ? "Highlight with note — click to edit" : "Click to add a note or remove highlight";
    range.surroundContents(mark);
    return true;
  } catch {
    return false;
  }
}

function assignBlockIds(root: HTMLElement) {
  const sel = "p, li, h1, h2, h3, h4, blockquote";
  const blocks = root.querySelectorAll(sel);
  let i = 0;
  blocks.forEach((el) => {
    if (el.closest("[data-skip-pid]")) return;
    el.setAttribute("data-pid", String(i++));
  });
}

function applyHighlights(root: HTMLElement, highlights: HighlightDto[]) {
  const sorted = [...highlights].sort((a, b) => {
    if (a.paragraphId !== b.paragraphId) return b.paragraphId - a.paragraphId;
    return b.startInParagraph - a.startInParagraph;
  });

  for (const h of sorted) {
    const block = root.querySelector(`[data-pid="${h.paragraphId}"]`) as HTMLElement | null;
    if (!block) continue;
    const cls = HL_CLASS[h.color] ?? HL_CLASS.amber;
    const hasNote = Boolean(h.note?.trim());
    wrapRangeInBlock(block, h.startInParagraph, h.endInParagraph, cls, h.id, hasNote);
  }
}

export function ArticleReader({
  itemId,
  contentHtml,
  kind,
  embedUrl,
  itemTitle,
  initialHighlights,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  /** Ignores mouseup when interacting with the new-highlight toolbar (clicking note/colors was collapsing selection and closing the popup). */
  const selPopupRef = useRef<HTMLDivElement>(null);
  const [highlights, setHighlights] = useState(initialHighlights);
  useEffect(() => {
    setHighlights(initialHighlights);
  }, [initialHighlights]);

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [selPopup, setSelPopup] = useState<{
    x: number;
    y: number;
    paragraphId: number;
    start: number;
    end: number;
    text: string;
  } | null>(null);
  const [newHighlightNote, setNewHighlightNote] = useState("");
  useEffect(() => {
    if (selPopup) setNewHighlightNote("");
  }, [selPopup]);

  const [highlightModal, setHighlightModal] = useState<{
    id: string;
    quotedText: string;
    note: string;
  } | null>(null);
  const [modalNoteDraft, setModalNoteDraft] = useState("");
  useEffect(() => {
    if (highlightModal) setModalNoteDraft(highlightModal.note ?? "");
  }, [highlightModal]);

  const [color, setColor] = useState<"amber" | "green" | "blue" | "rose">("amber");
  const [savingNew, setSavingNew] = useState(false);
  const [savingModal, setSavingModal] = useState(false);

  const refreshHighlights = useCallback(async () => {
    const res = await fetch(`/api/items/${itemId}`, { credentials: "include" });
    if (!res.ok) return;
    const data = await res.json();
    const raw = data.highlights ?? [];
    setHighlights(
      raw.map(
        (h: {
          id: string;
          paragraphId: number;
          startInParagraph: number;
          endInParagraph: number;
          quotedText: string;
          color: string;
          note?: string | null;
        }) => ({
          id: h.id,
          paragraphId: h.paragraphId,
          startInParagraph: h.startInParagraph,
          endInParagraph: h.endInParagraph,
          quotedText: h.quotedText,
          color: h.color,
          note: h.note ?? null,
        })
      )
    );
  }, [itemId]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || kind === "video") return;

    root.innerHTML = contentHtml;
    assignBlockIds(root);
    applyHighlights(root, highlights);
  }, [contentHtml, kind, highlights]);

  useEffect(() => {
    if (kind === "video") return;

    const onMouseUp = (e: MouseEvent) => {
      const target = e.target as Node;
      if (selPopupRef.current?.contains(target)) {
        return;
      }

      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !rootRef.current) {
        setSelPopup(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) {
        setSelPopup(null);
        return;
      }

      const anchor = sel.anchorNode;
      const focus = sel.focusNode;
      if (!anchor || !focus) {
        setSelPopup(null);
        return;
      }

      const aEl = anchor.nodeType === Node.TEXT_NODE ? anchor.parentElement : (anchor as Element);
      const fEl = focus.nodeType === Node.TEXT_NODE ? focus.parentElement : (focus as Element);
      const block = aEl?.closest("[data-pid]") as HTMLElement | null;
      const blockFocus = fEl?.closest("[data-pid]") as HTMLElement | null;
      if (
        !block ||
        !blockFocus ||
        block !== blockFocus ||
        !rootRef.current.contains(block)
      ) {
        setSelPopup(null);
        return;
      }

      const pid = Number(block.getAttribute("data-pid"));
      if (Number.isNaN(pid)) {
        setSelPopup(null);
        return;
      }

      const start = textLengthBeforeNode(block, sel.anchorNode!, sel.anchorOffset);
      const end = textLengthBeforeNode(block, sel.focusNode!, sel.focusOffset);
      const lo = Math.min(start, end);
      const hi = Math.max(start, end);
      if (hi - lo < 2) {
        setSelPopup(null);
        return;
      }

      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      setSelPopup({
        x: rect.left + rect.width / 2,
        y: rect.top,
        paragraphId: pid,
        start: lo,
        end: hi,
        text: block.textContent?.slice(lo, hi).trim() ?? text,
      });
    };

    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [kind]);

  useEffect(() => {
    if (!selPopup) return;
    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") setSelPopup(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selPopup]);

  useEffect(() => {
    if (!highlightModal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setHighlightModal(null);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [highlightModal]);

  const saveHighlight = async () => {
    if (!selPopup) return;
    setSavingNew(true);
    try {
      const noteTrim = newHighlightNote.trim();
      const res = await fetch(`/api/items/${itemId}/highlights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          paragraphId: selPopup.paragraphId,
          startInParagraph: selPopup.start,
          endInParagraph: selPopup.end,
          quotedText: selPopup.text,
          color,
          note: noteTrim === "" ? null : noteTrim,
        }),
      });
      if (res.ok) {
        window.getSelection()?.removeAllRanges();
        setSelPopup(null);
        await refreshHighlights();
      }
    } finally {
      setSavingNew(false);
    }
  };

  const removeHighlight = useCallback(
    async (highlightId: string) => {
      const res = await fetch(
        `/api/items/${itemId}/highlights?highlightId=${encodeURIComponent(highlightId)}`,
        { method: "DELETE", credentials: "include" }
      );
      if (res.ok) await refreshHighlights();
    },
    [itemId, refreshHighlights]
  );

  const saveModalNote = async () => {
    if (!highlightModal) return;
    setSavingModal(true);
    try {
      const res = await fetch(`/api/items/${itemId}/highlights`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          highlightId: highlightModal.id,
          note: modalNoteDraft.trim() === "" ? null : modalNoteDraft.trim(),
        }),
      });
      if (res.ok) {
        setHighlightModal(null);
        await refreshHighlights();
      }
    } finally {
      setSavingModal(false);
    }
  };

  const removeFromModal = async () => {
    if (!highlightModal) return;
    if (!window.confirm("Remove this highlight?")) return;
    await removeHighlight(highlightModal.id);
    setHighlightModal(null);
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root || kind === "video") return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement).closest("mark[data-highlight-id]");
      if (!el || !root.contains(el)) return;
      e.preventDefault();
      const id = el.getAttribute("data-highlight-id");
      if (!id) return;
      const h = highlights.find((x) => x.id === id);
      setHighlightModal({
        id,
        quotedText: h?.quotedText ?? el.textContent?.trim() ?? "",
        note: h?.note ?? "",
      });
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [kind, highlights]);

  const noteModal =
    highlightModal &&
    mounted &&
    createPortal(
      <div
        className={modalOverlay}
        role="presentation"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) setHighlightModal(null);
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="highlight-note-title"
          className={modalPanel}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <h2
            id="highlight-note-title"
            className="font-serif text-xl font-semibold text-stone-900 dark:text-stone-100"
          >
            Highlight note
          </h2>
          <blockquote className="mt-4 border-l-4 border-amber-400/80 pl-4 text-sm italic text-stone-700 dark:text-stone-300">
            {highlightModal.quotedText}
          </blockquote>
          <label htmlFor="highlight-note-field" className="mt-6 block text-xs font-medium text-stone-500">
            Your note
          </label>
          <textarea
            id="highlight-note-field"
            value={modalNoteDraft}
            onChange={(e) => setModalNoteDraft(e.target.value)}
            rows={4}
            placeholder="Why this stood out, ideas, follow-ups…"
            className="mt-2 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-950"
          />
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={savingModal}
              onClick={() => void saveModalNote()}
              className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600"
            >
              {savingModal ? "Saving…" : "Save note"}
            </button>
            <button
              type="button"
              disabled={savingModal}
              onClick={() => setHighlightModal(null)}
              className="rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-stone-600"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={savingModal}
              onClick={() => void removeFromModal()}
              className="rounded-lg border border-red-200 px-4 py-2 text-sm text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Remove highlight
            </button>
          </div>
        </div>
      </div>,
      document.body
    );

  if (kind === "video" && embedUrl) {
    const iframeTitle = itemTitle?.trim() || "Video";
    return (
      <div className="space-y-6">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg">
          <iframe
            title={iframeTitle}
            src={embedUrl}
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <p className="text-center text-sm text-[var(--reader-muted)]">
          Use <strong>Original</strong> in the top bar to open the source page.
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      {noteModal}

      {selPopup && (
        <div
          ref={selPopupRef}
          className="fixed z-50 flex max-w-[min(100vw-2rem,20rem)] -translate-x-1/2 -translate-y-full flex-col gap-2 rounded-lg border border-stone-200 bg-white p-3 shadow-xl dark:border-stone-700 dark:bg-stone-900"
          style={{ left: selPopup.x, top: selPopup.y - 8 }}
        >
          <label htmlFor="new-hl-note" className="text-xs font-medium text-stone-500">
            Note <span className="font-normal text-stone-400">(optional)</span>
          </label>
          <textarea
            id="new-hl-note"
            value={newHighlightNote}
            onChange={(e) => setNewHighlightNote(e.target.value)}
            rows={3}
            placeholder="Add a note, or leave blank…"
            autoFocus
            className="w-full resize-y rounded-md border border-stone-200 bg-stone-50 px-2 py-1.5 text-sm text-stone-800 placeholder:text-stone-400 dark:border-stone-600 dark:bg-stone-950 dark:text-stone-100"
          />
          <p className="text-xs text-stone-500 dark:text-stone-400">Highlight color</p>
          <div className="flex flex-wrap items-center gap-1">
            {(["amber", "green", "blue", "rose"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`${c} highlight`}
                aria-pressed={color === c}
                onClick={() => setColor(c)}
                className={`h-7 w-7 rounded-full border-2 ${
                  color === c ? "border-stone-800 dark:border-white" : "border-transparent"
                } ${
                  c === "amber"
                    ? "bg-amber-300"
                    : c === "green"
                      ? "bg-green-400"
                      : c === "blue"
                        ? "bg-blue-400"
                        : "bg-rose-400"
                }`}
              />
            ))}
            <span className="ml-1 text-[11px] text-stone-400">defaults to amber</span>
          </div>
          <button
            type="button"
            disabled={savingNew}
            onClick={() => void saveHighlight()}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600"
          >
            {savingNew ? "Saving…" : "Save highlight"}
          </button>
        </div>
      )}

      <div
        ref={rootRef}
        className="reader-prose font-serif text-lg leading-relaxed"
        suppressHydrationWarning
      />

      {highlights.length > 0 && (
        <aside className="mt-12 border-t border-stone-200 pt-8 dark:border-stone-800">
          <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-stone-500">
            Highlights
          </h2>
          <ul className="mt-4 space-y-3">
            {highlights.map((h) => (
              <li
                key={h.id}
                className="rounded-lg bg-stone-100/80 p-3 dark:bg-stone-900/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm text-stone-700 dark:text-stone-300">{h.quotedText}</span>
                  <div className="flex shrink-0 flex-col gap-1 sm:flex-row">
                    <button
                      type="button"
                      onClick={() =>
                        setHighlightModal({
                          id: h.id,
                          quotedText: h.quotedText,
                          note: h.note ?? "",
                        })
                      }
                      className="rounded-md px-2 py-1 text-xs font-medium text-amber-800 ring-1 ring-amber-200 hover:bg-amber-50 dark:text-amber-300 dark:ring-amber-900 dark:hover:bg-amber-950/40"
                    >
                      {h.note?.trim() ? "Edit note" : "Add note"}
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeHighlight(h.id)}
                      className="rounded-md px-2 py-1 text-xs font-medium text-stone-600 ring-1 ring-stone-200 hover:bg-red-50 hover:text-red-700 hover:ring-red-200 dark:text-stone-400 dark:ring-stone-600 dark:hover:bg-red-950/40 dark:hover:text-red-300"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {h.note?.trim() ? (
                  <p className="mt-2 border-t border-stone-200/80 pt-2 text-sm text-stone-600 dark:border-stone-700 dark:text-stone-400">
                    {h.note}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </aside>
      )}
    </div>
  );
}

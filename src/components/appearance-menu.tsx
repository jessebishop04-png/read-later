"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  APPEARANCES,
  type Appearance,
  applyAppearanceToDocument,
  applySansToDocument,
  applySerifToDocument,
  FONT_SLOT_IDS,
  type FontSlotId,
  isAppearance,
  isFontSlotId,
  SANS_LABELS,
  SERIF_LABELS,
  STORAGE_APPEARANCE,
  STORAGE_SANS,
  STORAGE_SERIF,
} from "@/lib/appearance";

function readAppearance(): Appearance {
  const s = document.documentElement.dataset.surface;
  return s && isAppearance(s) ? s : "light";
}

function readSans(): FontSlotId {
  const s = document.documentElement.dataset.sans;
  return s && isFontSlotId(s) ? s : "1";
}

function readSerif(): FontSlotId {
  const s = document.documentElement.dataset.serif;
  return s && isFontSlotId(s) ? s : "1";
}

/** Matches `--app-chrome-bg` in `globals.css` for each surface. */
const appearanceSwatch: Record<Appearance, string> = {
  light: "#fafaf9",
  dark: "#0c0a09",
  tan: "#f2ebe0",
  grey: "#eef0f3",
};

export function AppearanceMenu({ className = "" }: { className?: string }) {
  const [open, setOpen] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>("light");
  const [sans, setSans] = useState<FontSlotId>("1");
  const [serif, setSerif] = useState<FontSlotId>("1");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setAppearance(readAppearance());
    setSans(readSans());
    setSerif(readSerif());
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const pickAppearance = useCallback((a: Appearance) => {
    applyAppearanceToDocument(a);
    try {
      localStorage.setItem(STORAGE_APPEARANCE, a);
    } catch {
      /* ignore */
    }
    setAppearance(a);
  }, []);

  const pickSans = useCallback((n: FontSlotId) => {
    applySansToDocument(n);
    try {
      localStorage.setItem(STORAGE_SANS, n);
    } catch {
      /* ignore */
    }
    setSans(n);
  }, []);

  const pickSerif = useCallback((n: FontSlotId) => {
    applySerifToDocument(n);
    try {
      localStorage.setItem(STORAGE_SERIF, n);
    } catch {
      /* ignore */
    }
    setSerif(n);
  }, []);

  const appearanceLabel =
    appearance === "dark" ? "Dark" : appearance === "tan" ? "Tan" : appearance === "grey" ? "Grey" : "Light";

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={`Appearance and type: ${appearanceLabel}. Open menu.`}
        title="Appearance & type"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
          />
        </svg>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Appearance and typography"
          className="absolute right-0 top-full z-50 mt-2 w-[min(calc(100vw-2rem),18rem)] rounded-xl border border-stone-200 bg-white p-4 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        >
          <fieldset className="space-y-2 border-0 p-0">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Color
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {APPEARANCES.map((a) => (
                <label
                  key={a}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                    appearance === a
                      ? "border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100"
                      : "border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="read-later-appearance"
                    className="sr-only"
                    checked={appearance === a}
                    onChange={() => pickAppearance(a)}
                  />
                  <span
                    className="h-4 w-4 shrink-0 rounded border border-stone-300/90 dark:border-stone-500/90"
                    style={{ backgroundColor: appearanceSwatch[a] }}
                    aria-hidden
                  />
                  <span className="capitalize">{a}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4 space-y-2 border-0 border-t border-stone-200 p-0 pt-4 dark:border-stone-700">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Sans-serif
            </legend>
            <div className="flex flex-col gap-1.5">
              {FONT_SLOT_IDS.map((id, i) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                    sans === id
                      ? "border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100"
                      : "border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="read-later-sans"
                    className="sr-only"
                    checked={sans === id}
                    onChange={() => pickSans(id)}
                  />
                  <span className={`appearance-preview-sans-${id}`}>{SANS_LABELS[i]}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="mt-4 space-y-2 border-0 border-t border-stone-200 p-0 pt-4 dark:border-stone-700">
            <legend className="mb-2 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Serif
            </legend>
            <div className="flex flex-col gap-1.5">
              {FONT_SLOT_IDS.map((id, i) => (
                <label
                  key={id}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-sm ${
                    serif === id
                      ? "border-amber-500 bg-amber-50 text-amber-950 dark:border-amber-500 dark:bg-amber-950/40 dark:text-amber-100"
                      : "border-stone-200 text-stone-700 hover:bg-stone-50 dark:border-stone-600 dark:text-stone-200 dark:hover:bg-stone-800/60"
                  }`}
                >
                  <input
                    type="radio"
                    name="read-later-serif"
                    className="sr-only"
                    checked={serif === id}
                    onChange={() => pickSerif(id)}
                  />
                  <span className={`appearance-preview-serif-${id}`}>{SERIF_LABELS[i]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}
    </div>
  );
}

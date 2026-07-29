"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  FONT_SIZE_DEFAULT,
  FONT_SIZE_MAX,
  FONT_SIZE_MIN,
  FONT_SIZE_STEP,
  FONT_SLOT_IDS,
  LINE_HEIGHT_DEFAULT,
  LINE_HEIGHT_MAX,
  LINE_HEIGHT_MIN,
  LINE_HEIGHT_STEP,
  LINE_WIDTHS,
  SANS_LABELS,
  SERIF_LABELS,
  type FontSlotId,
  type LineWidth,
  type Theme,
  persistFontSize,
  persistLineHeight,
  persistLineWidth,
  persistReaderFace,
  persistSans,
  persistSerif,
  persistTheme,
  readStoredFontSize,
  readStoredLineHeight,
  readStoredLineWidth,
  readStoredReaderFace,
  readStoredSans,
  readStoredSerif,
  readStoredTheme,
  type ReaderFace,
} from "@/lib/appearance";

type PanelView = "main" | "typeface";

const lineWidthLabel: Record<LineWidth, string> = {
  narrow: "Narrow",
  medium: "Medium",
  wide: "Wide",
};

function IconAa({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 17L9 6.5h1.2L14.7 17M6.2 13.2h6.6M16.2 17V9.2c0-1.3.8-2.2 2.1-2.2.4 0 .8.1 1.1.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSun({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3.5v2.2M12 18.3v2.2M3.5 12h2.2M18.3 12h2.2M5.8 5.8l1.6 1.6M16.6 16.6l1.6 1.6M18.2 5.8l-1.6 1.6M7.4 16.6l-1.6 1.6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMoon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.5 3.8A8.5 8.5 0 118.2 19.6 7 7 0 0016.5 3.8z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconAuto({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 3.5v17" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path
        d="M12 3.5a8.5 8.5 0 010 17"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path d="M12 3.5a8.5 8.5 0 000 17" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function Stepper({
  onDec,
  onInc,
  disabledDec,
  disabledInc,
}: {
  onDec: () => void;
  onInc: () => void;
  disabledDec?: boolean;
  disabledInc?: boolean;
}) {
  return (
    <div className="flex items-center overflow-hidden rounded-md ring-1 ring-white/10">
      <button
        type="button"
        disabled={disabledDec}
        onClick={onDec}
        className="px-2.5 py-1 text-sm text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-white disabled:opacity-30"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="h-5 w-px bg-white/10" />
      <button
        type="button"
        disabled={disabledInc}
        onClick={onInc}
        className="px-2.5 py-1 text-sm text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-white disabled:opacity-30"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

function LineWidthControl({
  onNarrow,
  onWiden,
  disabledNarrow,
  disabledWiden,
}: {
  onNarrow: () => void;
  onWiden: () => void;
  disabledNarrow?: boolean;
  disabledWiden?: boolean;
}) {
  return (
    <div className="flex h-8 overflow-hidden rounded-lg bg-[color:var(--keepr-elevated)] ring-1 ring-[color:var(--keepr-faint)]/40">
      <button
        type="button"
        disabled={disabledNarrow}
        onClick={onNarrow}
        className="flex h-full w-10 items-center justify-center text-[color:var(--keepr-muted)] transition hover:bg-white/5 hover:text-keepr disabled:opacity-30"
        aria-label="Narrower line width"
      >
        {/* → ← compress */}
        <svg className="h-3.5 w-4" viewBox="0 0 20 12" fill="none" aria-hidden>
          <path
            d="M1.5 6h6M5.5 3.25 8.25 6 5.5 8.75M18.5 6h-6M14.5 3.25 11.75 6 14.5 8.75"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span className="w-px self-stretch bg-[color:var(--keepr-faint)]/40" />
      <button
        type="button"
        disabled={disabledWiden}
        onClick={onWiden}
        className="flex h-full w-10 items-center justify-center text-[color:var(--keepr-muted)] transition hover:bg-white/5 hover:text-keepr disabled:opacity-30"
        aria-label="Wider line width"
      >
        {/* ← → expand */}
        <svg className="h-3.5 w-4" viewBox="0 0 20 12" fill="none" aria-hidden>
          <path
            d="M8.5 6H2M4.75 3.25 2 6l2.75 2.75M11.5 6H18M15.25 3.25 18 6l-2.75 2.75"
            stroke="currentColor"
            strokeWidth="1.35"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}

export function CustomizeStylesControl() {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<PanelView>("main");
  const [theme, setTheme] = useState<Theme>("dark");
  const [sans, setSans] = useState<FontSlotId>("1");
  const [serif, setSerif] = useState<FontSlotId>("1");
  const [fontSize, setFontSize] = useState(FONT_SIZE_DEFAULT);
  const [lineHeight, setLineHeight] = useState(LINE_HEIGHT_DEFAULT);
  const [lineWidth, setLineWidth] = useState<LineWidth>("medium");
  const [readerFace, setReaderFace] = useState<ReaderFace>("serif");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setTheme(readStoredTheme());
    setSans(readStoredSans());
    setSerif(readStoredSerif());
    setReaderFace(readStoredReaderFace());
    setFontSize(readStoredFontSize());
    setLineHeight(readStoredLineHeight());
    setLineWidth(readStoredLineWidth());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || theme !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: light)");
    const onChange = () => persistTheme("auto");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, hydrated]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setView("main");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (view === "typeface") setView("main");
        else {
          setOpen(false);
          setView("main");
        }
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, view]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    gsap.killTweensOf(panel);
    gsap.fromTo(
      panel,
      { autoAlpha: 0, y: -8, scale: 0.96 },
      { autoAlpha: 1, y: 0, scale: 1, duration: 0.24, ease: "power2.out", transformOrigin: "top left" }
    );
    const rows = panel.querySelectorAll("[data-style-row]");
    if (rows.length) {
      gsap.fromTo(
        rows,
        { autoAlpha: 0, x: -6 },
        { autoAlpha: 1, x: 0, duration: 0.18, stagger: 0.025, delay: 0.05, ease: "power2.out" }
      );
    }
  }, [open, view]);

  const activeTypefaceLabel =
    readerFace === "sans" ? SANS_LABELS[Number(sans) - 1] : SERIF_LABELS[Number(serif) - 1];

  const cycleLineWidth = (dir: -1 | 1) => {
    const i = LINE_WIDTHS.indexOf(lineWidth);
    const next = LINE_WIDTHS[Math.min(LINE_WIDTHS.length - 1, Math.max(0, i + dir))];
    setLineWidth(next);
    persistLineWidth(next);
  };

  const chooseTheme = (t: Theme) => {
    setTheme(t);
    persistTheme(t);
  };

  const chooseSans = (id: FontSlotId) => {
    setSans(id);
    persistSans(id);
    setReaderFace("sans");
    persistReaderFace("sans");
  };

  const chooseSerif = (id: FontSlotId) => {
    setSerif(id);
    persistSerif(id);
    setReaderFace("serif");
    persistReaderFace("serif");
  };

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => {
          setOpen((o) => !o);
          setView("main");
        }}
        className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--keepr-muted)] transition hover:bg-[color:var(--keepr-elevated)] hover:text-white ${
          open ? "bg-[color:var(--keepr-elevated)] text-white" : ""
        }`}
        title="Customize styles"
        aria-label="Customize styles"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <IconAa className="h-5 w-5" />
      </button>

      {open ? (
        <div
          ref={panelRef}
          role="dialog"
          aria-label="Customize styles"
          className="absolute left-0 top-full z-50 mt-2 w-[min(100vw-2rem,20.5rem)] origin-top-left rounded-2xl bg-[color:var(--keepr-elevated)] p-3 shadow-2xl ring-1 ring-white/10"
          style={{ opacity: 0 }}
        >
          {view === "main" ? (
            <>
              <p
                data-style-row
                className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]"
              >
                System theme
              </p>
              <div data-style-row className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "light" as const, label: "Light", Icon: IconSun },
                    { id: "dark" as const, label: "Dark", Icon: IconMoon },
                    { id: "auto" as const, label: "Auto", Icon: IconAuto },
                  ] as const
                ).map(({ id, label, Icon }) => {
                  const active = theme === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => chooseTheme(id)}
                      className={`flex flex-col items-center gap-1.5 rounded-xl px-2 py-2.5 ring-1 transition ${
                        active
                          ? "bg-white/10 text-white ring-sky-400/80"
                          : "text-[color:var(--keepr-muted)] ring-white/10 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <span
                        className={`flex h-12 w-full items-center justify-center rounded-lg ${
                          id === "light"
                            ? "bg-white text-neutral-900"
                            : id === "dark"
                              ? "bg-neutral-950 text-white"
                              : "bg-gradient-to-r from-neutral-200 to-sky-600 text-white"
                        }`}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className={`text-[12px] ${active ? "font-semibold text-sky-300" : ""}`}>
                        {label}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p
                data-style-row
                className="mt-4 px-1 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]"
              >
                Text styles
              </p>

              <button
                type="button"
                data-style-row
                onClick={() => setView("typeface")}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-white/5"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[color:var(--keepr-muted)]">
                  <IconAa className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-white">Typeface</span>
                  <span className="block truncate text-[12px] text-[color:var(--keepr-muted)]">
                    {activeTypefaceLabel}
                  </span>
                </span>
                <span className="text-[color:var(--keepr-faint)]">›</span>
              </button>

              <div
                data-style-row
                className="flex items-center gap-3 rounded-xl px-2 py-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[12px] font-semibold text-[color:var(--keepr-muted)]">
                  TT
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-white">Font size</span>
                  <span className="block text-[12px] text-[color:var(--keepr-muted)]">{fontSize}px</span>
                </span>
                <Stepper
                  disabledDec={fontSize <= FONT_SIZE_MIN}
                  disabledInc={fontSize >= FONT_SIZE_MAX}
                  onDec={() => setFontSize(persistFontSize(fontSize - FONT_SIZE_STEP))}
                  onInc={() => setFontSize(persistFontSize(fontSize + FONT_SIZE_STEP))}
                />
              </div>

              <div
                data-style-row
                className="flex items-center gap-3 rounded-xl px-2 py-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[color:var(--keepr-muted)]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M7 6h10M7 12h10M7 18h10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path d="M4 8.5v7M20 8.5v7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-white">Line spacing</span>
                  <span className="block text-[12px] text-[color:var(--keepr-muted)]">
                    {lineHeight.toFixed(1)}
                  </span>
                </span>
                <Stepper
                  disabledDec={lineHeight <= LINE_HEIGHT_MIN}
                  disabledInc={lineHeight >= LINE_HEIGHT_MAX}
                  onDec={() => setLineHeight(persistLineHeight(lineHeight - LINE_HEIGHT_STEP))}
                  onInc={() => setLineHeight(persistLineHeight(lineHeight + LINE_HEIGHT_STEP))}
                />
              </div>

              <div
                data-style-row
                className="flex items-center gap-3 rounded-xl px-2 py-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[color:var(--keepr-muted)]">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M5 8h14M5 16h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                    <path
                      d="M8 5L5 8l3 3M16 13l3 3-3 3"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] text-white">Line width</span>
                  <span className="block text-[12px] text-[color:var(--keepr-muted)]">
                    {lineWidthLabel[lineWidth]}
                  </span>
                </span>
                <LineWidthControl
                  disabledNarrow={lineWidth === "narrow"}
                  disabledWiden={lineWidth === "wide"}
                  onNarrow={() => cycleLineWidth(-1)}
                  onWiden={() => cycleLineWidth(1)}
                />
              </div>
            </>
          ) : (
            <>
              <div data-style-row className="mb-2 flex items-center gap-2 px-1">
                <button
                  type="button"
                  onClick={() => setView("main")}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-white"
                  aria-label="Back"
                >
                  ‹
                </button>
                <p className="text-sm font-semibold text-white">Typeface</p>
              </div>

              <p
                data-style-row
                className="px-2 pb-1 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]"
              >
                Serif
              </p>
              {FONT_SLOT_IDS.map((id, i) => {
                const active = readerFace === "serif" && serif === id;
                return (
                  <button
                    key={`serif-${id}`}
                    type="button"
                    data-style-row
                    onClick={() => chooseSerif(id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left ${
                      active ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span className={`appearance-preview-serif-${id} min-w-0 flex-1 text-[15px] text-white`}>
                      {SERIF_LABELS[i]}
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full ring-1 ${
                        active ? "bg-sky-500 ring-sky-400 text-white" : "ring-white/20 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}

              <p
                data-style-row
                className="mt-3 px-2 pb-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]"
              >
                Sans serif
              </p>
              {FONT_SLOT_IDS.map((id, i) => {
                const active = readerFace === "sans" && sans === id;
                return (
                  <button
                    key={`sans-${id}`}
                    type="button"
                    data-style-row
                    onClick={() => chooseSans(id)}
                    className={`flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left ${
                      active ? "bg-white/10" : "hover:bg-white/5"
                    }`}
                  >
                    <span className={`appearance-preview-sans-${id} min-w-0 flex-1 text-[15px] text-white`}>
                      {SANS_LABELS[i]}
                    </span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full ring-1 ${
                        active ? "bg-sky-500 ring-sky-400 text-white" : "ring-white/20 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>
        ) : null}
    </div>
  );
}

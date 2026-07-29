"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useOptionalTts } from "@/components/tts-context";
import { TTS_RATES, formatRateLabel, groupVoicesByLanguage } from "@/lib/tts";

type Panel = "none" | "voice" | "speed" | "languages";

function IconWave({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 12h1.5M8 8v8M12 5v14M16 8v8M20 12h1.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconSkipBack15({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M7.5 12a6.5 6.5 0 111.2 3.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M7 8.5v3.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="14.2" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="currentColor">
        15
      </text>
    </svg>
  );
}

function IconSkipForward15({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M16.5 12a6.5 6.5 0 10-1.2 3.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M17 8.5v3.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <text x="12" y="14.2" textAnchor="middle" fontSize="7.5" fontWeight="600" fill="currentColor">
        15
      </text>
    </svg>
  );
}

function IconPlay({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8.5 6.8v10.4a.8.8 0 001.2.7l8.2-5.2a.8.8 0 000-1.4L9.7 6.1a.8.8 0 00-1.2.7z" />
    </svg>
  );
}

function IconPause({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="7" y="6" width="3.5" height="12" rx="1" />
      <rect x="13.5" y="6" width="3.5" height="12" rx="1" />
    </svg>
  );
}

function IconClose({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 7l10 10M17 7L7 17" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function IconVolume({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.5 10v4h3l4 3.5V6.5L7.5 10h-3z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M15 9.5a3.5 3.5 0 010 5M17.5 7.5a6 6 0 010 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function siteLabel(siteName?: string | null, sourceUrl?: string | null) {
  if (siteName) return siteName.replace(/^www\./, "").toLowerCase();
  if (!sourceUrl) return "";
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function TtsPlayer() {
  const tts = useOptionalTts();
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>("none");

  useEffect(() => {
    if (!tts?.visible) setPanel("none");
  }, [tts?.visible]);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el || !tts?.visible) return;
    gsap.fromTo(
      el,
      { y: 28, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.28, ease: "power2.out" }
    );
  }, [tts?.visible]);

  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el || panel === "none") return;
    gsap.fromTo(
      el,
      { y: 8, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.18, ease: "power2.out" }
    );
  }, [panel]);

  useEffect(() => {
    if (!tts?.visible) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setPanel("none");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [tts?.visible]);

  const voices = tts?.voices ?? [];
  const groups = useMemo(() => groupVoicesByLanguage(voices), [voices]);
  const activeVoice =
    voices.find((v) => v.uri === tts?.voiceURI) || voices[0] || null;
  const focusedLang = tts?.langFilter || activeVoice?.langKey || "en";
  const focusedGroup = groups.find((g) => g.langKey === focusedLang) || groups[0];
  const voiceList = panel === "languages" ? null : focusedGroup?.voices || voices;

  if (!tts || !tts.visible) return null;

  const {
    status,
    rate,
    volume,
    voiceURI,
    progress,
    elapsedLabel,
    durationLabel,
    document: doc,
    togglePlay,
    stop,
    skipBack,
    skipForward,
    setRate,
    setVolume,
    setVoiceURI,
    setLangFilter,
  } = tts;

  const playing = status === "playing";
  const site = siteLabel(doc?.siteName, doc?.sourceUrl);

  return (
    <div
      ref={rootRef}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[70]"
      style={{ opacity: 0 }}
    >
      <div className="pointer-events-auto relative border-t border-white/10 bg-[color:var(--keepr-elevated)]/95 backdrop-blur-md">
        {panel === "voice" || panel === "languages" ? (
          <div
            ref={panelRef}
            className="absolute bottom-full right-3 mb-2 max-h-80 w-[min(100vw-1.5rem,20rem)] overflow-y-auto rounded-2xl bg-[color:var(--keepr-elevated)] p-2 shadow-2xl ring-1 ring-white/10 scrollbar-hide sm:right-6"
            style={{ opacity: 0 }}
          >
            {panel === "languages" ? (
              <>
                <div className="mb-1 flex items-center gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setPanel("voice")}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-keepr"
                    aria-label="Back"
                  >
                    ‹
                  </button>
                  <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]">
                    All languages
                  </p>
                </div>
                {groups.map((g) => {
                  const active = g.langKey === focusedLang;
                  return (
                    <button
                      key={g.langKey}
                      type="button"
                      onClick={() => {
                        setLangFilter(g.langKey);
                        setPanel("voice");
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                        active
                          ? "bg-white/10 text-keepr"
                          : "text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-keepr"
                      }`}
                    >
                      <span className="font-medium">{g.langLabel}</span>
                      <span className="text-[11px] text-[color:var(--keepr-faint)]">
                        {g.voices.length}
                      </span>
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                <p className="px-2 pb-1.5 pt-1 text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]">
                  {focusedGroup ? focusedGroup.langLabel : "Voices"}
                </p>
                {!voiceList || voiceList.length === 0 ? (
                  <p className="px-2 py-3 text-sm text-[color:var(--keepr-muted)]">
                    No voices for this language on your system.
                  </p>
                ) : (
                  voiceList.map((v) => {
                    const active = (voiceURI || activeVoice?.uri) === v.uri;
                    return (
                      <button
                        key={v.uri}
                        type="button"
                        onClick={() => {
                          setVoiceURI(v.uri);
                          setPanel("none");
                        }}
                        className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${
                          active
                            ? "bg-white/10 text-keepr"
                            : "text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-keepr"
                        }`}
                      >
                        <span className="min-w-0 truncate font-medium">{v.name}</span>
                        {active ? <span className="text-sky-400">✓</span> : null}
                      </button>
                    );
                  })
                )}
                {groups.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setPanel("languages")}
                    className="mt-1 w-full rounded-xl px-3 py-2.5 text-left text-[13px] font-medium text-sky-400 hover:bg-white/5"
                  >
                    View all languages
                  </button>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {panel === "speed" ? (
          <div
            ref={panelRef}
            className="absolute bottom-full right-16 mb-2 w-[min(100vw-1.5rem,18rem)] rounded-2xl bg-[color:var(--keepr-elevated)] p-3 shadow-2xl ring-1 ring-white/10 sm:right-28"
            style={{ opacity: 0 }}
          >
            <p className="px-1 pb-2 text-[11px] font-medium uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]">
              Speed
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {TTS_RATES.map((r) => {
                const active = rate === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => {
                      setRate(r);
                      setPanel("none");
                    }}
                    className={`rounded-lg px-2 py-2 text-center text-[13px] font-medium tabular-nums transition ${
                      active
                        ? "bg-sky-500 text-white"
                        : "bg-white/5 text-[color:var(--keepr-muted)] hover:bg-white/10 hover:text-keepr"
                    }`}
                  >
                    {formatRateLabel(r)}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-4 sm:px-5 sm:py-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {doc?.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={doc.imageUrl}
                alt=""
                className="hidden h-11 w-11 shrink-0 rounded-md object-cover sm:block"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-md bg-[color:var(--keepr-pill)] text-xs font-semibold text-keepr sm:flex">
                Aa
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-[13px] font-medium text-keepr">{doc?.title || "Listening"}</p>
              {tts.translating ? (
                <p className="truncate text-[12px] text-sky-400">Translating…</p>
              ) : tts.translateError ? (
                <p className="truncate text-[12px] text-rose-400" title={tts.translateError}>
                  Translation unavailable — playing original
                </p>
              ) : site ? (
                <p className="truncate text-[12px] text-[color:var(--keepr-faint)]">{site}</p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={skipBack}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--keepr-muted)] transition hover:bg-white/5 hover:text-keepr"
                title="Back 15 seconds"
                aria-label="Back 15 seconds"
              >
                <IconSkipBack15 className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={togglePlay}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--keepr-text)] text-[color:var(--keepr-bg)] transition hover:opacity-90"
                title={playing ? "Pause (P)" : "Play (P)"}
                aria-label={playing ? "Pause" : "Play"}
              >
                {playing ? <IconPause className="h-4 w-4" /> : <IconPlay className="h-4 w-4" />}
              </button>
              <button
                type="button"
                onClick={skipForward}
                className="flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--keepr-muted)] transition hover:bg-white/5 hover:text-keepr"
                title="Forward 15 seconds"
                aria-label="Forward 15 seconds"
              >
                <IconSkipForward15 className="h-5 w-5" />
              </button>
            </div>
            <div className="flex w-[min(100%,16rem)] items-center gap-2">
              <span className="w-8 shrink-0 text-right text-[11px] tabular-nums text-[color:var(--keepr-faint)]">
                {elapsedLabel}
              </span>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[color:var(--keepr-muted)] transition-[width] duration-300"
                  style={{ width: `${Math.max(1, progress * 100)}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-[11px] tabular-nums text-[color:var(--keepr-faint)]">
                {durationLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <div className="hidden items-center gap-2 md:flex">
              <IconVolume className="h-4 w-4 text-[color:var(--keepr-muted)]" />
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="h-1 w-20 cursor-pointer accent-sky-400"
                aria-label="Volume"
              />
            </div>

            <button
              type="button"
              onClick={() => setPanel((p) => (p === "speed" ? "none" : "speed"))}
              className={`rounded-full px-2.5 py-1.5 text-[12px] font-semibold tabular-nums transition ${
                panel === "speed"
                  ? "bg-white/10 text-keepr"
                  : "text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-keepr"
              }`}
              aria-expanded={panel === "speed"}
            >
              {formatRateLabel(rate)}
            </button>

            <button
              type="button"
              onClick={() => setPanel((p) => (p === "voice" ? "none" : "voice"))}
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium transition ${
                panel === "voice"
                  ? "bg-white/10 text-keepr"
                  : "text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-keepr"
              }`}
              aria-expanded={panel === "voice"}
            >
              <IconWave className="h-3.5 w-3.5" />
              <span className="max-w-[7rem] truncate">{activeVoice?.name || "Voice"}</span>
            </button>

            <button
              type="button"
              onClick={stop}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[color:var(--keepr-muted)] transition hover:bg-white/5 hover:text-keepr"
              title="Stop"
              aria-label="Stop"
            >
              <IconClose className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

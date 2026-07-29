"use client";

import { useMemo } from "react";
import { useTts } from "@/components/tts-context";

type Props = {
  title: string;
  author: string | null;
  siteName: string | null;
  sourceUrl: string;
  excerpt: string | null;
  contentText: string | null;
  createdAt: string;
};

function domainLabel(url: string, siteName: string | null): string {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host.toUpperCase();
  } catch {
    return (siteName || "SOURCE").replace(/^www\./i, "").toUpperCase();
  }
}

function faviconUrl(url: string): string | null {
  try {
    const host = new URL(url).hostname;
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=64`;
  } catch {
    return null;
  }
}

function readingMins(text: string | null): number {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220) || 1);
}

function formatMetaDate(iso: string): string {
  const d = new Date(iso);
  const day = d.getDate();
  const ord =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const month = d.toLocaleDateString(undefined, { month: "short" });
  return `${month} ${day}${ord}`;
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

export function ReadArticleHeader({
  title,
  author,
  siteName,
  sourceUrl,
  excerpt,
  contentText,
  createdAt,
}: Props) {
  const tts = useTts();
  const domain = useMemo(() => domainLabel(sourceUrl, siteName), [sourceUrl, siteName]);
  const icon = useMemo(() => faviconUrl(sourceUrl), [sourceUrl]);
  const mins = useMemo(() => readingMins(contentText), [contentText]);
  const dateLabel = useMemo(() => formatMetaDate(createdAt), [createdAt]);
  const showExcerpt =
    Boolean(excerpt) && !excerpt!.toLowerCase().includes("data mine or scrape");

  const listening = tts.visible && tts.status !== "idle";
  const playing = tts.status === "playing";

  const onListen = () => {
    if (tts.visible && tts.status === "playing") {
      tts.pause();
      return;
    }
    if (tts.visible && tts.status === "paused") {
      tts.resume();
      return;
    }
    tts.start();
  };

  return (
    <header className="mb-10">
      <div className="flex items-center justify-between gap-4">
        <a
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex min-w-0 items-center gap-2 text-[color:var(--keepr-muted)] transition hover:text-keepr"
        >
          {icon ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={icon}
              alt=""
              width={18}
              height={18}
              className="h-[18px] w-[18px] shrink-0 rounded-[3px] bg-[color:var(--keepr-pill)] object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[3px] bg-[color:var(--keepr-pill)] text-[10px] font-semibold text-keepr">
              {(domain[0] || "K").toUpperCase()}
            </span>
          )}
          <span className="truncate text-[11px] font-medium uppercase tracking-[0.08em]">
            {domain}
          </span>
        </a>

        <button
          type="button"
          onClick={onListen}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--keepr-faint)]/40 px-3 py-1 text-[12px] font-medium text-[color:var(--keepr-muted)] transition hover:border-[color:var(--keepr-faint)]/70 hover:text-keepr"
          aria-pressed={listening}
        >
          {playing ? <IconPause className="h-3 w-3" /> : <IconPlay className="h-3 w-3" />}
          {playing ? "Pause" : listening ? "Resume" : "Listen"}
        </button>
      </div>

      <h1 className="reader-title mt-5 text-[1.85rem] font-bold leading-[1.2] tracking-tight sm:text-[2.35rem] sm:leading-[1.15]">
        {title}
      </h1>

      <div className="mt-6 border-t border-[color:var(--keepr-faint)]/25" />

      <div className="mt-3 flex items-baseline justify-between gap-4 text-[13px] text-[color:var(--keepr-muted)]">
        <p className="min-w-0 truncate">
          {[author, `${mins} min${mins === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
        </p>
        <time dateTime={createdAt} className="shrink-0" title={new Date(createdAt).toLocaleString()}>
          {dateLabel}
        </time>
      </div>

      {showExcerpt ? <p className="reader-dek mt-5">{excerpt}</p> : null}
    </header>
  );
}

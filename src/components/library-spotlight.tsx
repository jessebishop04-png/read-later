"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const STORAGE_KEY = "keepr-spotlight-dismissed";

export type SpotlightItem = {
  id: string;
  title: string;
  excerpt: string | null;
  imageUrl: string | null;
  siteName: string | null;
  kind: string;
};

export function LibrarySpotlight({ item }: { item: SpotlightItem | null }) {
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (!item) {
      setHidden(true);
      return;
    }
    try {
      const dismissed = localStorage.getItem(STORAGE_KEY);
      setHidden(dismissed === item.id);
    } catch {
      setHidden(false);
    }
  }, [item]);

  if (!item || hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, item.id);
    } catch {
      /* ignore */
    }
    setHidden(true);
  };

  return (
    <section className="keepr-on-dark relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-900 via-rose-800 to-rose-700">
      <div className="grid min-h-[200px] gap-4 p-6 md:grid-cols-[1fr_minmax(180px,280px)_1fr] md:items-center md:gap-6 md:p-8">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
            Spotlight
          </p>
          <h2 className="mt-2 text-2xl font-semibold leading-tight text-white md:text-3xl">
            {item.title}
          </h2>
          <p className="mt-2 line-clamp-2 text-sm text-white/75">
            {item.excerpt?.trim() ||
              (item.kind === "video"
                ? "A saved video worth revisiting."
                : "Something worth reading when you have a moment.")}
          </p>
        </div>

        <div className="mx-auto w-full max-w-[240px]">
          <div className="aspect-square overflow-hidden rounded-xl bg-black/20 shadow-lg">
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={item.imageUrl}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-white/50">
                {item.kind === "video" ? "Video" : item.kind === "pdf" ? "PDF" : item.kind === "email" ? "Email" : "Article"}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3 md:items-end">
          {item.siteName && (
            <p className="text-sm text-white/70">{item.siteName}</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/read/${item.id}`}
              className="rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
            >
              Open
            </Link>
            <button
              type="button"
              onClick={dismiss}
              className="text-sm text-white/80 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

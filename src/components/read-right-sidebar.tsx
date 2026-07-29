"use client";

import gsap from "gsap";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useReadChrome } from "@/components/read-chrome-context";
import { KeeprChatPanel } from "@/components/keepr-chat-panel";
import { ReaderScanPanel, textForScan } from "@/components/scan/reader-scan-panel";
import { useContainRegionWheel } from "@/lib/contain-region-wheel";

export type ReadSidebarHighlight = {
  id: string;
  quotedText: string;
  color: string;
  note: string | null;
};

export type ReadSidebarItem = {
  id: string;
  title: string;
  author: string | null;
  siteName: string | null;
  sourceUrl: string;
  excerpt: string | null;
  kind: string;
  createdAt: string;
  contentText: string | null;
  contentHtml?: string | null;
  notes: string | null;
  imageUrl?: string | null;
  highlights: ReadSidebarHighlight[];
};

type TabId = "info" | "notebook" | "scan" | "chat";

const OPEN_WIDTH = 340;
const COLLAPSED_WIDTH = 48;

function domainFromUrl(url: string, siteName: string | null): string {
  if (siteName) return siteName.replace(/^www\./, "");
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function wordStats(text: string | null): { words: number; mins: number } {
  const words = (text || "").trim().split(/\s+/).filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / 220));
  return { words, mins };
}

function formatKind(kind: string): string {
  if (kind === "video") return "Video";
  if (kind === "pdf") return "PDF";
  if (kind === "email") return "Email";
  if (kind === "book") return "Book";
  if (kind === "podcast") return "Podcast";
  return "Article";
}

function IconPanel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M15.5 4.5v15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconHelp({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M9.6 9.4a2.4 2.4 0 114.2 1.6c-.7.7-1.4 1.1-1.4 2.2"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.6" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconGhost({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" aria-hidden>
      <path
        d="M24 6c-8.3 0-15 6.7-15 15v17.2c0 1.8 1.9 2.9 3.4 1.9l2.8-1.9 2.8 1.9c1.1.7 2.5.7 3.6 0l2.4-1.6 2.4 1.6c1.1.7 2.5.7 3.6 0l2.8-1.9 2.8 1.9c1.5 1 3.4-.1 3.4-1.9V21c0-8.3-6.7-15-15-15z"
        fill="#a78bfa"
      />
      <circle cx="18.5" cy="22" r="2.4" fill="#0a0a0a" />
      <circle cx="29.5" cy="22" r="2.4" fill="#0a0a0a" />
      <circle cx="18.5" cy="22.4" r="1.1" fill="#e5e5e5" />
      <circle cx="29.5" cy="22.4" r="1.1" fill="#e5e5e5" />
      <path
        d="M20 28.5c1.2 1.4 2.5 2.1 4 2.1s2.8-.7 4-2.1"
        stroke="#0a0a0a"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MetaRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string;
  href?: string;
}) {
  const inner = (
    <>
      <span className="text-[13px] text-[color:var(--keepr-muted)]">{label}</span>
      <span className="flex min-w-0 items-center gap-1 text-[13px] text-white">
        <span className="truncate">{value}</span>
        {href ? (
          <span className="text-[color:var(--keepr-faint)] opacity-0 transition group-hover:opacity-100">→</span>
        ) : null}
      </span>
    </>
  );

  const className =
    "group flex items-center justify-between gap-3 rounded-md px-2 py-1.5 transition-colors hover:bg-[color:var(--keepr-elevated-hover)]";

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
        {inner}
      </a>
    );
  }

  return <div className={className}>{inner}</div>;
}

function SectionLabel({ children, trailing }: { children: ReactNode; trailing?: ReactNode }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-2">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]">
        {children}
      </h3>
      {trailing}
    </div>
  );
}

type Props = {
  item: ReadSidebarItem;
};

export function ReadRightSidebar({ item }: Props) {
  const { rightPanelOpen: open, setRightPanelOpen, toggleRightPanel } = useReadChrome();
  const [tab, setTab] = useState<TabId>("scan");
  const [hydrated, setHydrated] = useState(false);

  const shellRef = useRef<HTMLElement | null>(null);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const labelsRef = useRef<HTMLDivElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  useContainRegionWheel(regionRef);

  const domain = domainFromUrl(item.sourceUrl, item.siteName);
  const { words, mins } = wordStats(item.contentText);
  const notebookCount = item.highlights.length + (item.notes?.trim() ? 1 : 0);
  const authorInitial = (item.author || domain || "K").trim().charAt(0).toUpperCase();
  const summary =
    item.excerpt && !item.excerpt.toLowerCase().includes("data mine or scrape")
      ? item.excerpt
      : item.contentText
        ? item.contentText.replace(/\s+/g, " ").trim().slice(0, 420) +
          (item.contentText.length > 420 ? "…" : "")
        : "No summary available for this document yet.";

  useEffect(() => {
    const onTab = (e: Event) => {
      const tab = (e as CustomEvent<TabId>).detail;
      if (tab === "info" || tab === "notebook" || tab === "scan" || tab === "chat") {
        setTab(tab);
        setRightPanelOpen(true);
      }
    };
    window.addEventListener("keepr:read-panel-tab", onTab);
    return () => window.removeEventListener("keepr:read-panel-tab", onTab);
  }, [setRightPanelOpen]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell || !hydrated) return;

    tweenRef.current?.kill();

    const labels = labelsRef.current
      ? Array.from(labelsRef.current.querySelectorAll("[data-tab-label]"))
      : [];
    const body = bodyRef.current;
    const targetWidth = open ? OPEN_WIDTH : COLLAPSED_WIDTH;

    if (open) {
      tweenRef.current = gsap.to(shell, {
        width: targetWidth,
        duration: 0.42,
        ease: "power3.out",
        overwrite: true,
        onStart: () => {
          shell.setAttribute("aria-hidden", "false");
        },
      });
      if (labels.length) {
        gsap.fromTo(
          labels,
          { autoAlpha: 0, x: 10 },
          { autoAlpha: 1, x: 0, duration: 0.28, stagger: 0.04, delay: 0.12, ease: "power2.out" }
        );
      }
      if (body) {
        gsap.fromTo(
          body,
          { autoAlpha: 0, x: 16 },
          { autoAlpha: 1, x: 0, duration: 0.34, delay: 0.1, ease: "power2.out" }
        );
      }
    } else {
      if (body) gsap.to(body, { autoAlpha: 0, x: 12, duration: 0.16, ease: "power1.in" });
      if (labels.length) gsap.to(labels, { autoAlpha: 0, x: 8, duration: 0.14, ease: "power1.in" });
      tweenRef.current = gsap.to(shell, {
        width: targetWidth,
        duration: 0.38,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          shell.setAttribute("aria-hidden", "true");
        },
      });
      return () => {
        tweenRef.current?.kill();
      };
    }

    return () => {
      tweenRef.current?.kill();
    };
  }, [open, hydrated]);

  const tabs: { id: TabId; label: string; badge?: number }[] = [
    { id: "info", label: "Info" },
    { id: "notebook", label: "Notebook", badge: notebookCount },
    { id: "scan", label: "Scan" },
    { id: "chat", label: "Chat" },
  ];

  return (
    <div
      ref={regionRef}
      className="sticky top-0 z-20 hidden h-dvh shrink-0 self-start overscroll-contain lg:block"
    >
      <aside
        ref={shellRef}
        className="relative h-full overflow-hidden bg-keepr text-keepr"
        style={{ width: open ? OPEN_WIDTH : COLLAPSED_WIDTH }}
        aria-label="Document panel"
      >
        <button
          type="button"
          onClick={() => toggleRightPanel()}
          className="absolute right-1.5 top-2.5 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--keepr-muted)] hover:bg-[color:var(--keepr-elevated)] hover:text-keepr"
          title={open ? "Hide right panel" : "Show right panel"}
          aria-label={open ? "Hide right panel" : "Show right panel"}
          aria-pressed={open}
        >
          <IconPanel className="h-5 w-5" />
        </button>

        <div className="flex h-full w-[340px] flex-col bg-keepr">
          <div className="flex h-14 shrink-0 items-center px-4 pr-12">
            <div
              ref={labelsRef}
              className={`flex min-h-9 min-w-0 flex-1 items-center gap-0.5 overflow-hidden ${
                open ? "" : "pointer-events-none invisible"
              }`}
            >
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    data-tab-label
                    onClick={() => setTab(t.id)}
                    className={`relative flex min-h-9 items-center px-2 text-[13px] transition-colors ${
                      active
                        ? "font-semibold text-keepr"
                        : "font-medium text-[color:var(--keepr-muted)] hover:text-keepr"
                    }`}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {t.label}
                      {typeof t.badge === "number" ? (
                        <span className="inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[color:var(--keepr-pill)] px-1 text-[10px] font-semibold text-[color:var(--keepr-muted)]">
                          {t.badge}
                        </span>
                      ) : null}
                    </span>
                    {active ? (
                      <span className="absolute inset-x-1.5 bottom-1 h-px bg-[color:var(--keepr-muted)]" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div
            ref={bodyRef}
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-hide ${open ? "" : "pointer-events-none invisible"}`}
          >
            {tab === "info" ? (
              <div className="flex min-h-full flex-col">
                <div className="space-y-5 px-4 py-4">
                  <div>
                    <h2 className="text-[1.35rem] font-semibold leading-snug tracking-tight text-keepr">
                      {item.title}
                    </h2>
                    <p className="mt-1 text-[13px] text-[color:var(--keepr-muted)]">{domain}</p>
                  </div>

                  {item.author ? (
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--keepr-pill)] text-sm font-semibold text-white">
                        {authorInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-white">{item.author}</p>
                        <p className="truncate text-[12px] text-[color:var(--keepr-muted)]">{domain}</p>
                      </div>
                    </div>
                  ) : null}

                  <section>
                    <SectionLabel trailing={<IconGhost className="h-4 w-4 opacity-90" />}>Summary</SectionLabel>
                    <p className="text-[13px] leading-relaxed text-[color:var(--keepr-muted)]">{summary}</p>
                    <p className="mt-2 text-[11px] text-[color:var(--keepr-faint)]">
                      Summarized from saved document
                    </p>
                  </section>

                  <section>
                    <SectionLabel>Metadata</SectionLabel>
                    <div className="-mx-2 space-y-0.5">
                      <MetaRow label="Type" value={formatKind(item.kind)} />
                      <MetaRow label="Domain" value={domain} href={item.sourceUrl} />
                      <MetaRow
                        label="Saved"
                        value={new Date(item.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      />
                      <MetaRow
                        label="Length"
                        value={`${mins} min${mins === 1 ? "" : "s"} (${words.toLocaleString()} words)`}
                      />
                      <MetaRow label="Language" value="English" />
                    </div>
                  </section>
                </div>

                <div className="mt-auto border-t border-[color:var(--keepr-border)] px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setTab("info")}
                      className="text-[13px] text-[color:var(--keepr-muted)] hover:text-white hover:underline"
                    >
                      Document info
                    </button>
                    <button
                      type="button"
                      className="flex h-7 w-7 items-center justify-center rounded-full bg-[color:var(--keepr-elevated)] text-white ring-1 ring-white/10"
                      title="Help"
                      aria-label="Help"
                    >
                      <IconHelp className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {tab === "notebook" ? (
              <div className="flex min-h-full flex-col px-4 py-4">
                <SectionLabel>Notes</SectionLabel>
                {item.notes?.trim() ? (
                  <p className="mb-5 whitespace-pre-wrap text-[13px] leading-relaxed text-[color:var(--keepr-muted)]">
                    {item.notes}
                  </p>
                ) : (
                  <p className="mb-5 text-[13px] text-[color:var(--keepr-faint)]">No document notes yet.</p>
                )}

                <SectionLabel>Highlights</SectionLabel>
                {item.highlights.length === 0 ? (
                  <p className="text-[13px] text-[color:var(--keepr-faint)]">
                    Select text in the article to add highlights. They’ll show up here.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {item.highlights.map((h) => (
                      <li
                        key={h.id}
                        className="rounded-lg bg-[color:var(--keepr-elevated)] px-3 py-2.5 ring-1 ring-[color:var(--keepr-border)]"
                      >
                        <p className="text-[13px] leading-relaxed text-white">“{h.quotedText}”</p>
                        {h.note ? (
                          <p className="mt-2 border-t border-[color:var(--keepr-border)] pt-2 text-[12px] text-[color:var(--keepr-muted)]">
                            {h.note}
                          </p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : null}

            {tab === "scan" ? (
              <ReaderScanPanel
                itemId={item.id}
                title={item.title}
                contentText={textForScan(item.contentText, item.contentHtml)}
              />
            ) : null}

            {tab === "chat" ? <KeeprChatPanel itemId={item.id} title={item.title} /> : null}
          </div>
        </div>
      </aside>
    </div>
  );
}

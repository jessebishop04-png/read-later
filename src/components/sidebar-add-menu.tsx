"use client";

import gsap from "gsap";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { normalizeUrlInput } from "@/lib/normalize-url";
import { ForwardEmailPanel } from "@/components/forward-email-panel";
import {
  IconLink,
  IconMail,
  IconMore,
  IconPlay,
  IconPlusCircle,
} from "@/components/ui-icons";

function IconUpload({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
      />
    </svg>
  );
}

function IconRss({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 5c7.18 0 13 5.82 13 13M6 11a7 7 0 017 7m-6 0a1 1 0 11-2 0 1 1 0 012 0z"
      />
    </svg>
  );
}

function IconBird({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path d="M22 5.8c-.7.3-1.5.5-2.3.6.8-.5 1.4-1.2 1.7-2.1-.8.5-1.6.8-2.5 1A4 4 0 0011.5 8c0 .3 0 .6.1.9-3.3-.2-6.3-1.8-8.3-4.2-.3.6-.5 1.2-.5 1.9 0 1.4.7 2.6 1.8 3.3-.6 0-1.2-.2-1.8-.5v.1c0 1.9 1.4 3.5 3.2 3.9-.3.1-.7.1-1.1.1-.3 0-.5 0-.8-.1.5 1.6 2 2.7 3.8 2.8A8 8 0 012 18.6a11.3 11.3 0 006.1 1.8c7.3 0 11.4-6.1 11.4-11.4v-.5c.8-.6 1.5-1.3 2-2.1z" />
    </svg>
  );
}

function IconSwap({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
      />
    </svg>
  );
}

function IconGlobe({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.7 0 3-4 3-9s-1.3-9-3-9m0 18c-1.7 0-3-4-3-9s1.3-9 3-9"
      />
    </svg>
  );
}

function IconDesktop({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function IconSliders({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 6h16M4 12h10M4 18h7M14 12h6M11 18h9"
      />
    </svg>
  );
}

type Mode = "menu" | "url" | "email";

function MenuRow({
  icon,
  label,
  shortcut,
  onClick,
  disabled,
}: {
  icon: ReactNode;
  label: string;
  shortcut?: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      data-add-item
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-[13px] text-[color:var(--keepr-muted)] transition hover:bg-white/5 hover:text-white disabled:opacity-40"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center opacity-90">{icon}</span>
      <span className="min-w-0 flex-1 truncate font-medium">{label}</span>
      {shortcut ? (
        <span className="shrink-0 text-[11px] tabular-nums text-[color:var(--keepr-faint)]">
          {shortcut}
        </span>
      ) : null}
    </button>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-white/10" role="separator" />;
}

export function SidebarAddMenu() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("menu");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const close = () => {
    setOpen(false);
    setMode("menu");
    setUrl("");
    setError(null);
    setNotice(null);
  };

  const comingSoon = (label: string) => {
    setNotice(`${label} — coming soon`);
    window.setTimeout(() => setNotice(null), 2200);
  };

  const updatePanelPos = () => {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + 8, left: rect.left });
  };

  useLayoutEffect(() => {
    if (!open) {
      setPanelPos(null);
      return;
    }
    updatePanelPos();
  }, [open, mode]);

  useEffect(() => {
    if (!open) return;
    const onMove = () => updatePanelPos();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || panelRef.current?.contains(t)) return;
      close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (mode !== "menu") return;
      if (e.key === "a" || e.key === "A") {
        if (e.shiftKey) return;
        e.preventDefault();
        setMode("url");
      }
      if (e.key === "u" || e.key === "U") {
        e.preventDefault();
        fileRef.current?.click();
      }
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, mode]);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!open || !panel) return;
    gsap.killTweensOf(panel);
    gsap.fromTo(
      panel,
      { autoAlpha: 0, y: -8, scale: 0.96 },
      {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        duration: 0.24,
        ease: "power2.out",
        transformOrigin: "top left",
      }
    );
    const rows = panel.querySelectorAll("[data-add-item]");
    if (rows.length) {
      gsap.fromTo(
        rows,
        { autoAlpha: 0, x: -6 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.18,
          stagger: 0.02,
          delay: 0.04,
          ease: "power2.out",
        }
      );
    }
    // Re-run when the portaled panel first mounts (panelPos becomes set).
  }, [open, mode, Boolean(panelPos)]);

  const saveUrl = async () => {
    const raw = url.trim();
    if (!raw || busy) return;
    setBusy(true);
    setError(null);
    try {
      const normalizedUrl = normalizeUrlInput(raw);
      const res = await fetch("/api/items", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not save");
        return;
      }
      close();
      if (data.id) {
        router.push(`/read/${data.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const uploadPdf = async (file: File) => {
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/items/pdf", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { id?: string; error?: string };
      if (!res.ok) {
        setError(data.error || "Could not upload PDF");
        setOpen(true);
        setMode("menu");
        return;
      }
      close();
      if (data.id) {
        router.push(`/read/${data.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setBusy(false);
    }
  };

  const iconClass = "h-4 w-4";

  const panel =
    open && mounted && panelPos
      ? createPortal(
          <div
            ref={panelRef}
            className={`fixed z-[80] rounded-2xl border border-white/10 bg-[color:var(--keepr-elevated)] p-1.5 shadow-2xl ${
              mode === "email" ? "w-[min(100vw-2rem,20rem)]" : "w-[min(100vw-2rem,17.5rem)]"
            }`}
            style={{ top: panelPos.top, left: panelPos.left, opacity: 0 }}
          >
            {mode === "url" ? (
              <div className="space-y-2 p-2" data-add-item>
                <p className="px-1 text-[12px] font-medium text-[color:var(--keepr-muted)]">
                  Save a URL
                </p>
                <input
                  autoFocus
                  type="text"
                  inputMode="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void saveUrl();
                    }
                  }}
                  placeholder="https://…"
                  className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-white outline-none placeholder:text-[color:var(--keepr-faint)] focus:border-white/25"
                />
                {error ? <p className="px-1 text-[12px] text-rose-400">{error}</p> : null}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("menu");
                      setError(null);
                    }}
                    className="rounded-lg px-3 py-1.5 text-[12px] text-[color:var(--keepr-muted)] hover:text-white"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={busy || !url.trim()}
                    onClick={() => void saveUrl()}
                    className="ml-auto rounded-lg bg-white px-3 py-1.5 text-[12px] font-semibold text-black disabled:opacity-40"
                  >
                    {busy ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            ) : mode === "email" ? (
              <div className="space-y-2 p-2" data-add-item>
                <div className="flex items-center gap-2 px-1">
                  <button
                    type="button"
                    onClick={() => setMode("menu")}
                    className="rounded-lg px-1 py-0.5 text-[12px] text-[color:var(--keepr-muted)] hover:text-white"
                  >
                    Back
                  </button>
                  <p className="text-[12px] font-medium text-[color:var(--keepr-muted)]">Email</p>
                </div>
                <ForwardEmailPanel compact />
                <button
                  type="button"
                  onClick={() => {
                    close();
                    router.push("/settings");
                  }}
                  className="w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-sky-400 hover:text-sky-300"
                >
                  Open in Settings
                </button>
              </div>
            ) : (
              <>
                <MenuRow
                  icon={<IconLink className={iconClass} />}
                  label="URL"
                  shortcut="A"
                  onClick={() => {
                    setMode("url");
                    setError(null);
                  }}
                />
                <MenuRow
                  icon={<IconUpload className={iconClass} />}
                  label="Upload"
                  shortcut="U"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                />
                <Divider />
                <MenuRow
                  icon={<IconMail className={iconClass} />}
                  label="Email"
                  onClick={() => {
                    setMode("email");
                    setError(null);
                    setNotice(null);
                  }}
                />
                <MenuRow
                  icon={<IconRss className={iconClass} />}
                  label="RSS Feed"
                  shortcut="⇧A"
                  onClick={() => comingSoon("RSS Feed")}
                />
                <MenuRow
                  icon={<IconBird className={iconClass} />}
                  label="Twitter List"
                  shortcut="⇧A"
                  onClick={() => comingSoon("Twitter List")}
                />
                <MenuRow
                  icon={<IconPlay className={iconClass} />}
                  label="YouTube Channel"
                  shortcut="⇧A"
                  onClick={() => comingSoon("YouTube Channel")}
                />
                <Divider />
                <MenuRow
                  icon={<IconSwap className={iconClass} />}
                  label="Configure integrations"
                  onClick={() => comingSoon("Configure integrations")}
                />
                <MenuRow
                  icon={<IconGlobe className={iconClass} />}
                  label="Get browser extension"
                  onClick={() => comingSoon("Browser extension")}
                />
                <MenuRow
                  icon={<IconDesktop className={iconClass} />}
                  label="Download apps"
                  onClick={() => comingSoon("Download apps")}
                />
                <Divider />
                <MenuRow
                  icon={<IconSliders className={iconClass} />}
                  label="Discover new documents"
                  onClick={() => comingSoon("Discover")}
                />
                <Divider />
                <MenuRow
                  icon={<IconMore className={iconClass} />}
                  label="More options"
                  onClick={() => {
                    close();
                    router.push("/add");
                  }}
                />
                {notice ? (
                  <p className="px-2.5 py-1.5 text-[11px] text-[color:var(--keepr-faint)]">
                    {notice}
                  </p>
                ) : null}
                {error ? (
                  <p className="px-2.5 py-1.5 text-[11px] text-rose-400">{error}</p>
                ) : null}
              </>
            )}
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setMode("menu");
          setError(null);
          setNotice(null);
        }}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--keepr-muted)] transition hover:bg-[color:var(--keepr-elevated)] hover:text-keepr"
        aria-label="Add to library"
        aria-expanded={open}
        title="Add"
      >
        <IconPlusCircle className="h-5 w-5" />
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void uploadPdf(f);
        }}
      />

      {panel}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; text: string; pending?: boolean };

const PRESETS = [
  { label: "Summarize this doc", prompt: "Summarize the key points of the open document." },
  { label: "Explain simply", prompt: "Explain the open document in simple terms." },
  { label: "Brainstorm ideas", prompt: "Give me a few creative ideas related to what I'm reading — or ask me what I want to brainstorm." },
  { label: "Ask anything", prompt: "What can you help me with right now?" },
];

function IconGhost({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 64 64" fill="none" aria-hidden>
      <path
        d="M32 8c-10 0-18 8-18 18v22c0 2 1.5 3 3 2.2 2-.9 3.5.2 3.5 2.3V56c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-3.5c0-2.1 1.5-3.2 3.5-2.3 1.5.8 3-.2 3-2.2V56c0 1.1.9 2 2 2h4c1.1 0 2-.9 2-2v-3.5c0-2.1 1.5-3.2 3.5-2.3 1.5.8 3-.2 3-2.2V26c0-10-8-18-18-18z"
        fill="currentColor"
        className="text-white/15"
      />
      <circle cx="24" cy="28" r="3" fill="currentColor" className="text-white/50" />
      <circle cx="40" cy="28" r="3" fill="currentColor" className="text-white/50" />
    </svg>
  );
}

type Props = {
  itemId: string;
  title: string;
};

export function KeeprChatPanel({ itemId, title }: Props) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [presetsOpen, setPresetsOpen] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);
  const presetsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMessages([]);
    setDraft("");
    setError(null);
    setBusy(false);
    setPresetsOpen(false);
  }, [itemId]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  useEffect(() => {
    if (!presetsOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!presetsRef.current?.contains(e.target as Node)) setPresetsOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [presetsOpen]);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? draft).trim();
    if (!text || busy) return;

    setError(null);
    setDraft("");
    setPresetsOpen(false);

    const nextMessages: Msg[] = [...messages, { role: "user", text }];
    setMessages([...nextMessages, { role: "assistant", text: "Thinking…", pending: true }]);
    setBusy(true);

    try {
      const payload = nextMessages.map((m) => ({
        role: m.role,
        content: m.text,
      }));
      const res = await fetch(`/api/items/${encodeURIComponent(itemId)}/chat`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: payload }),
      });
      const data = (await res.json().catch(() => ({}))) as { reply?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Chat request failed");
      }
      const reply = data.reply?.trim();
      if (!reply) throw new Error("Empty reply");
      setMessages([...nextMessages, { role: "assistant", text: reply }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Chat failed";
      setError(msg);
      setMessages(nextMessages);
      setDraft(text);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col px-4 py-5">
      {messages.length === 0 ? (
        <div className="mb-6 flex flex-col items-center px-4 pt-8 text-center">
          <IconGhost className="h-14 w-14" />
          <h3 className="mt-3 text-lg font-semibold tracking-tight text-white">Keepr Chat</h3>
          <p className="mt-2 max-w-[16rem] text-[12px] leading-relaxed text-[color:var(--keepr-muted)]">
            Ask anything — general questions, ideas, or about “{title.slice(0, 48)}
            {title.length > 48 ? "…" : ""}” when you want document help.
          </p>
        </div>
      ) : (
        <div ref={listRef} className="mb-4 flex-1 space-y-3 overflow-y-auto scrollbar-hide">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}-${m.pending ? "p" : "d"}`}
              className={`rounded-xl px-3 py-2 text-[13px] leading-relaxed whitespace-pre-wrap ${
                m.role === "user"
                  ? "ml-6 bg-white text-black"
                  : "mr-4 bg-[color:var(--keepr-elevated)] text-[color:var(--keepr-muted)] ring-1 ring-white/5"
              } ${m.pending ? "animate-pulse opacity-70" : ""}`}
            >
              {m.text}
            </div>
          ))}
        </div>
      )}

      {error ? (
        <p className="mb-2 text-[12px] leading-relaxed text-rose-400">{error}</p>
      ) : null}

      <div className="mt-auto space-y-3">
        <div className="rounded-xl bg-[color:var(--keepr-elevated)] p-2 ring-1 ring-white/10">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            disabled={busy}
            placeholder="Ask anything…"
            className="w-full resize-none bg-transparent px-2 py-1.5 text-[13px] text-white placeholder:text-[color:var(--keepr-faint)] focus:outline-none disabled:opacity-60"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="mt-1 flex items-center justify-between gap-2 px-1 pb-0.5">
            <div className="relative flex min-w-0 flex-wrap gap-1.5" ref={presetsRef}>
              <button
                type="button"
                disabled={busy}
                className="rounded-full bg-[color:var(--keepr-pill)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--keepr-muted)] hover:text-white disabled:opacity-40"
                onClick={() => setPresetsOpen((v) => !v)}
                aria-expanded={presetsOpen}
              >
                Preset prompts ▾
              </button>
              {presetsOpen ? (
                <div className="absolute bottom-full left-0 z-10 mb-1 w-48 overflow-hidden rounded-xl border border-white/10 bg-[color:var(--keepr-elevated)] py-1 shadow-xl">
                  {PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-[12px] text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-white"
                      onClick={() => void send(p.prompt)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              ) : null}
              <span className="rounded-full bg-[color:var(--keepr-pill)] px-2.5 py-1 text-[11px] font-medium text-[color:var(--keepr-muted)]">
                Keepr
              </span>
            </div>
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || !draft.trim()}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-white text-black disabled:opacity-30"
              aria-label="Send"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M12 19V5m0 0l-6 6m6-6l6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pb-1">
          <button
            type="button"
            disabled={busy || messages.length === 0}
            onClick={() => {
              setMessages([]);
              setError(null);
            }}
            className="text-[13px] text-[color:var(--keepr-muted)] hover:text-white disabled:opacity-40"
          >
            Clear chat
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";

export function SearchReindexPanel() {
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/search/reindex", { method: "POST", credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg(typeof data.error === "string" ? data.error : "Reindex failed");
        return;
      }
      setMsg(`Indexed ${data.indexed ?? 0} items${data.failed ? ` (${data.failed} failed)` : ""}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="mt-12 rounded-xl bg-[color:var(--keepr-elevated)] p-6">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--keepr-faint)]">
        Semantic search
      </h2>
      <p className="mt-2 text-sm text-[color:var(--keepr-muted)]">
        Requires <code className="text-white/80">OPENAI_API_KEY</code> in your environment. New
        saves are indexed automatically; use this to backfill existing items.
      </p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void run()}
        className="mt-4 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {busy ? "Indexing…" : "Reindex library"}
      </button>
      {msg && (
        <p className="mt-3 text-sm text-[color:var(--keepr-muted)]" role="status">
          {msg}
        </p>
      )}
    </section>
  );
}

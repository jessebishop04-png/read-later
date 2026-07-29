"use client";

import { useCallback, useEffect, useState } from "react";

type TokenRow = {
  id: string;
  name: string;
  lastUsedAt: string | null;
  createdAt: string;
};

export function ApiTokensPanel() {
  const [tokens, setTokens] = useState<TokenRow[]>([]);
  const [name, setName] = useState("Browser extension");
  const [newToken, setNewToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/tokens");
    if (!res.ok) return;
    const data = await res.json();
    setTokens(data.tokens ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNewToken(null);
    try {
      const res = await fetch("/api/tokens", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        setNewToken(data.token);
        setName("Browser extension");
        await load();
      }
    } finally {
      setLoading(false);
    }
  };

  const revoke = async (id: string) => {
    if (!confirm("Revoke this token? The extension will stop working until you create a new one."))
      return;
    await fetch(`/api/tokens?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    await load();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-[color:var(--keepr-elevated)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--keepr-faint)]">
          New API token
        </h2>
        <p className="mt-2 text-sm text-[color:var(--keepr-muted)]">
          Paste this token into the extension options. It is shown only once.
        </p>
        <form onSubmit={createToken} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label"
            className="flex-1 rounded-xl border-0 bg-[color:var(--keepr-pill)] px-3 py-2 text-sm text-white placeholder:text-[color:var(--keepr-faint)] focus:outline-none focus:ring-1 focus:ring-white/20"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
          >
            Generate
          </button>
        </form>
        {newToken && (
          <div className="mt-4 rounded-xl bg-black/40 p-3">
            <p className="text-xs font-medium text-[color:var(--keepr-muted)]">Copy now:</p>
            <code className="mt-1 block break-all text-sm text-white">{newToken}</code>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-[color:var(--keepr-elevated)] p-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-[color:var(--keepr-faint)]">
          Active tokens
        </h2>
        {tokens.length === 0 ? (
          <p className="mt-3 text-sm text-[color:var(--keepr-muted)]">No tokens yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-white/10">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-white">{t.name}</p>
                  <p className="text-xs text-[color:var(--keepr-faint)]">
                    Created {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt &&
                      ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(t.id)}
                  className="text-sm text-red-400 hover:underline"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

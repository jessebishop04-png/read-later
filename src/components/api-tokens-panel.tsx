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
      <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-stone-500">
          New API token
        </h2>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Paste this token into the extension options. It is shown only once.
        </p>
        <form onSubmit={createToken} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Label"
            className="flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-950"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600"
          >
            Generate
          </button>
        </form>
        {newToken && (
          <div className="mt-4 rounded-lg bg-amber-50 p-3 dark:bg-amber-950/40">
            <p className="text-xs font-medium text-amber-900 dark:text-amber-200">Copy now:</p>
            <code className="mt-1 block break-all text-sm text-stone-800 dark:text-stone-200">
              {newToken}
            </code>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wide text-stone-500">
          Active tokens
        </h2>
        {tokens.length === 0 ? (
          <p className="mt-3 text-sm text-stone-500">No tokens yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
            {tokens.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-100">{t.name}</p>
                  <p className="text-xs text-stone-500">
                    Created {new Date(t.createdAt).toLocaleDateString()}
                    {t.lastUsedAt &&
                      ` · Last used ${new Date(t.lastUsedAt).toLocaleDateString()}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => revoke(t.id)}
                  className="text-sm text-red-600 hover:underline dark:text-red-400"
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

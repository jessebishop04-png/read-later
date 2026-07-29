"use client";

import { normalizeUrlInput } from "@/lib/normalize-url";
import { useRouter } from "next/navigation";
import { useState } from "react";

/** Instapaper-style quick add at the top of Home. */
export function HomeAddLinkBar() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const raw = url.trim();
    if (!raw) return;
    setLoading(true);
    try {
      const normalizedUrl = normalizeUrlInput(raw);
      const res = await fetch("/api/items", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Could not save");
        return;
      }
      setUrl("");
      if (typeof data.id === "string") {
        router.push(`/read/${data.id}`);
        router.refresh();
      } else {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="mb-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="home-add-url" className="sr-only">
          Add a link
        </label>
        <input
          id="home-add-url"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Add a link…"
          className="min-w-0 flex-1 rounded-lg border border-white/15 bg-transparent px-4 py-3 text-[15px] text-white placeholder:text-[color:var(--keepr-faint)] focus:border-white/35 focus:outline-none"
        />
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="shrink-0 rounded-lg bg-white px-5 py-3 text-sm font-semibold text-black hover:bg-neutral-200 disabled:opacity-40"
        >
          {loading ? "Saving…" : "Add"}
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </form>
  );
}

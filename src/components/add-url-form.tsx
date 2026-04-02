"use client";

import { normalizeUrlInput } from "@/lib/normalize-url";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const normalizedUrl = normalizeUrlInput(url);
      const res = await fetch("/api/items", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, tags: tagList }),
      });
      const ct = res.headers.get("content-type") ?? "";
      const data =
        ct.includes("application/json") ? await res.json().catch(() => (null as unknown)) : null;

      if (!res.ok || !data || typeof data !== "object") {
        const msg =
          data && typeof data === "object" && "error" in data && typeof (data as { error: string }).error === "string"
            ? (data as { error: string }).error
            : res.status === 401
              ? "Session expired — sign in again, then try saving."
              : "Could not save";
        setError(msg);
        return;
      }

      const id = "id" in data && typeof (data as { id: unknown }).id === "string" ? (data as { id: string }).id : null;
      if (!id) {
        setError("Save failed — no item was created. Try signing out and back in.");
        return;
      }

      router.push(`/read/${id}`);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label htmlFor="url" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          URL
        </label>
        <input
          id="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/article or example.com/article"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        />
      </div>
      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-stone-700 dark:text-stone-300">
          Tags (optional)
        </label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="reading, longform"
          className="mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-stone-900 shadow-sm focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100"
        />
        <p className="mt-1 text-xs text-stone-500">Comma-separated</p>
      </div>
      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-amber-700 py-3 font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600 dark:hover:bg-amber-500"
      >
        {loading ? "Saving…" : "Save to library"}
      </button>
    </form>
  );
}

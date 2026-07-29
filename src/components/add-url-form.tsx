"use client";

import { normalizeUrlInput } from "@/lib/normalize-url";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function AddUrlForm() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [tags, setTags] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const field =
    "mt-1 w-full rounded-xl border-0 bg-[color:var(--keepr-elevated)] px-4 py-3 text-white placeholder:text-[color:var(--keepr-faint)] focus:outline-none focus:ring-1 focus:ring-white/20";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      if (pdfFile) {
        const fd = new FormData();
        fd.set("file", pdfFile);
        if (tagList.length) fd.set("tags", tagList.join(","));
        const res = await fetch("/api/items/pdf", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          setError(typeof data.error === "string" ? data.error : "Could not save PDF");
          return;
        }
        if (typeof data.id === "string") {
          router.push(`/read/${data.id}`);
          router.refresh();
        }
        return;
      }

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
        <label htmlFor="url" className="block text-sm font-medium text-[color:var(--keepr-muted)]">
          URL
        </label>
        <input
          id="url"
          type="text"
          inputMode="url"
          autoComplete="url"
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            if (e.target.value.trim()) setPdfFile(null);
          }}
          placeholder="https://example.com/article or …/file.pdf"
          className={field}
          disabled={Boolean(pdfFile)}
          required={!pdfFile}
        />
      </div>

      <div>
        <p className="mb-2 text-center text-xs text-[color:var(--keepr-faint)]">or</p>
        <label htmlFor="pdf" className="block text-sm font-medium text-[color:var(--keepr-muted)]">
          Upload PDF
        </label>
        <input
          id="pdf"
          type="file"
          accept="application/pdf,.pdf"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setPdfFile(f);
            if (f) setUrl("");
          }}
          className="mt-1 block w-full text-sm text-[color:var(--keepr-muted)] file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-sm file:font-semibold file:text-black"
        />
        {pdfFile && (
          <p className="mt-1 text-xs text-[color:var(--keepr-faint)]">
            {pdfFile.name} ({Math.round(pdfFile.size / 1024)} KB)
          </p>
        )}
      </div>

      <div>
        <label htmlFor="tags" className="block text-sm font-medium text-[color:var(--keepr-muted)]">
          Tags (optional)
        </label>
        <input
          id="tags"
          type="text"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="reading, longform"
          className={field}
        />
        <p className="mt-1 text-xs text-[color:var(--keepr-faint)]">Comma-separated</p>
      </div>
      {error && (
        <p className="rounded-xl bg-red-950/50 px-3 py-2 text-sm text-red-200">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading || (!url.trim() && !pdfFile)}
        className="w-full rounded-xl bg-white py-3.5 font-semibold text-black hover:bg-neutral-200 disabled:opacity-50"
      >
        {loading ? "Saving…" : pdfFile ? "Save PDF" : "Save to library"}
      </button>
    </form>
  );
}

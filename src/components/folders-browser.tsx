"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { IconFolder, IconMore, IconPlusSmall, IconSearch } from "@/components/ui-icons";

export type FolderCard = {
  id: string;
  name: string;
  itemCount: number;
  thumbs: (string | null)[];
};

function FolderThumb({ thumbs }: { thumbs: (string | null)[] }) {
  const images = thumbs.filter(Boolean) as string[];
  if (images.length >= 4) {
    return (
      <div className="grid h-full w-full grid-cols-2 grid-rows-2 gap-0.5 bg-black">
        {images.slice(0, 4).map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={i} src={src} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ))}
      </div>
    );
  }
  if (images.length === 1) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={images[0]} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />;
  }
  return (
    <div className="flex h-full w-full items-center justify-center bg-teal-950">
      <IconFolder className="h-14 w-14 text-teal-300/80" />
    </div>
  );
}

export function FoldersBrowser({ folders }: { folders: FolderCard[] }) {
  const router = useRouter();
  const [filter, setFilter] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter((f) => f.name.toLowerCase().includes(q));
  }, [folders, filter]);

  const createFolder = async () => {
    if (creating) return;
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    setCreating(true);
    setMenuOpen(false);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        router.refresh();
        if (data.id) router.push(`/library?folderId=${encodeURIComponent(data.id)}`);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <div className="relative mb-6 flex items-center gap-2">
        <h1 className="text-3xl font-bold text-white">Folders</h1>
        <div className="relative">
          <button
            type="button"
            className="rounded-full p-2 text-[color:var(--keepr-muted)] hover:bg-[color:var(--keepr-elevated)] hover:text-white"
            aria-label="Folder options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <IconMore className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[12rem] rounded-lg bg-[color:var(--keepr-elevated)] py-1 shadow-xl ring-1 ring-white/10">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white hover:bg-white/5"
                  onClick={() => void createFolder()}
                  disabled={creating}
                >
                  <IconPlusSmall className="h-4 w-4" />
                  {creating ? "Creating…" : "Create folder"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="relative mb-8">
        <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--keepr-faint)]" />
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter folders"
          className="w-full rounded-full border border-white/15 bg-transparent py-3 pl-10 pr-4 text-sm text-white placeholder:text-[color:var(--keepr-faint)] focus:border-white/30 focus:outline-none"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-[color:var(--keepr-muted)]">
          {folders.length === 0 ? (
            <>
              No folders yet.{" "}
              <button type="button" className="text-white underline" onClick={() => void createFolder()}>
                Create one
              </button>
              .
            </>
          ) : (
            "No folders match your filter."
          )}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {filtered.map((f) => (
            <li key={f.id}>
              <Link href={`/library?folderId=${encodeURIComponent(f.id)}`} className="group block">
                <div className="aspect-square overflow-hidden rounded-lg bg-[color:var(--keepr-elevated)]">
                  <FolderThumb thumbs={f.thumbs} />
                </div>
                <p className="mt-2 truncate text-sm font-semibold text-white">{f.name}</p>
                <p className="text-xs uppercase tracking-wide text-[color:var(--keepr-faint)]">
                  {f.itemCount} {f.itemCount === 1 ? "item" : "items"}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

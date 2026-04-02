"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  IconArchive,
  IconFolder,
  IconFolderPlus,
  IconHeart,
  IconHome,
  IconNotes,
  IconPlay,
  IconTag,
} from "@/components/ui-icons";

export type DrawerFolder = { id: string; name: string };

const drawerIconClass = "h-4 w-4 shrink-0 opacity-90";

const mainNav: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  match: (p: string, q: URLSearchParams) => boolean;
}[] = [
  {
    href: "/library",
    label: "Home",
    Icon: IconHome,
    match: (p: string, q: URLSearchParams) =>
      p === "/library" &&
      !q.get("view") &&
      !q.get("folderId") &&
      q.get("archived") !== "true",
  },
  {
    href: "/library?view=liked",
    label: "Liked",
    Icon: IconHeart,
    match: (_p: string, q: URLSearchParams) => q.get("view") === "liked",
  },
  {
    href: "/library?view=archive",
    label: "Archive",
    Icon: IconArchive,
    match: (_p: string, q: URLSearchParams) => q.get("view") === "archive",
  },
  {
    href: "/library?view=videos",
    label: "Videos",
    Icon: IconPlay,
    match: (_p: string, q: URLSearchParams) => q.get("view") === "videos",
  },
  {
    href: "/library?view=notes",
    label: "Notes",
    Icon: IconNotes,
    match: (_p: string, q: URLSearchParams) => q.get("view") === "notes",
  },
  {
    href: "/tags",
    label: "Tags",
    Icon: IconTag,
    match: ((p: string) => p === "/tags" || p.startsWith("/tags/")) as (
      p: string,
      q: URLSearchParams
    ) => boolean,
  },
];

type Props = {
  open: boolean;
  onClose: () => void;
  folders: DrawerFolder[];
};

function NavLink({
  href,
  label,
  active,
  onNavigate,
  Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  onNavigate: () => void;
  Icon: ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium ${
        active
          ? "bg-amber-100 text-amber-950 dark:bg-amber-950/50 dark:text-amber-50"
          : "text-stone-700 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
      }`}
    >
      <Icon className={drawerIconClass} />
      {label}
    </Link>
  );
}

export function AppDrawer({ open, onClose, folders }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) panelRef.current?.querySelector<HTMLElement>("a,button")?.focus();
  }, [open]);

  const folderId = searchParams.get("folderId");
  const isFolderActive = (id: string) => Boolean(folderId && folderId === id);

  const createFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newFolderName.trim();
    if (!name || creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const data = (await res.json()) as { id?: string };
        setNewFolderName("");
        router.refresh();
        if (data.id) router.push(`/library?folderId=${encodeURIComponent(data.id)}`);
        onClose();
      }
    } finally {
      setCreating(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        aria-label="Close menu"
        onClick={onClose}
      />
      <aside
        id="app-drawer"
        ref={panelRef}
        className="relative flex h-full w-[min(100%,280px)] flex-col border-r border-stone-200 bg-white shadow-xl dark:border-stone-800 dark:bg-stone-950"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 dark:border-stone-800">
          <span className="font-serif text-lg font-semibold text-amber-900 dark:text-amber-100">Menu</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
            aria-label="Close"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Library</p>
          <div className="space-y-0.5">
            {mainNav.map(({ href, label, Icon, match }) => {
              const active = match(pathname, searchParams);
              return (
                <NavLink
                  key={href}
                  href={href}
                  label={label}
                  active={active}
                  onNavigate={onClose}
                  Icon={Icon}
                />
              );
            })}
          </div>

          <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-stone-400">Folders</p>
          <div className="space-y-0.5">
            {folders.map((f) => (
              <NavLink
                key={f.id}
                href={`/library?folderId=${encodeURIComponent(f.id)}`}
                label={f.name}
                active={isFolderActive(f.id)}
                onNavigate={onClose}
                Icon={IconFolder}
              />
            ))}
          </div>

          <form onSubmit={createFolder} className="mt-4 space-y-2 border-t border-stone-200 pt-4 dark:border-stone-800">
            <label htmlFor="new-folder" className="sr-only">
              New folder name
            </label>
            <input
              id="new-folder"
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder name"
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-900"
            />
            <button
              type="submit"
              disabled={creating || !newFolderName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-stone-800 py-2 text-sm font-medium text-white hover:bg-stone-900 disabled:opacity-50 dark:bg-stone-700"
            >
              <IconFolderPlus className={drawerIconClass} />
              {creating ? "Creating…" : "Add folder"}
            </button>
          </form>
        </nav>
      </aside>
    </div>
  );
}

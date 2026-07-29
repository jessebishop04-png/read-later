"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";
import {
  IconArticle,
  IconBook,
  IconChevronDown,
  IconChevronRight,
  IconFolder,
  IconFolderPlus,
  IconHeart,
  IconHome,
  IconMail,
  IconNotes,
  IconPdf,
  IconPlay,
  IconPodcast,
  IconSearch,
  IconTag,
  IconTrash,
} from "@/components/ui-icons";

export type DrawerFolder = { id: string; name: string };

const LIBRARY_OPEN_KEY = "keepr-sidebar-library-open";
const drawerIconClass = "h-4 w-4 shrink-0 opacity-90";

const primaryNav: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  match: (p: string, q: URLSearchParams) => boolean;
}[] = [
  {
    href: "/check",
    label: "Advanced AI Scan",
    Icon: IconSearch,
    match: (p) =>
      p === "/check" || p.startsWith("/check/") || p === "/scan" || p.startsWith("/scan/"),
  },
  {
    href: "/library",
    label: "Home",
    Icon: IconHome,
    match: (p, q) =>
      p === "/library" &&
      !q.get("view") &&
      !q.get("folderId") &&
      q.get("archived") !== "true",
  },
  {
    href: "/review",
    label: "Review",
    Icon: IconNotes,
    match: (p) => p === "/review" || p.startsWith("/review/"),
  },
  {
    href: "/folders",
    label: "Folders",
    Icon: IconFolder,
    match: (p) => p === "/folders" || p.startsWith("/folders/"),
  },
];

const libraryNav: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  match: (p: string, q: URLSearchParams) => boolean;
}[] = [
  {
    href: "/library?view=articles",
    label: "Articles",
    Icon: IconArticle,
    match: (_p, q) => q.get("view") === "articles",
  },
  {
    href: "/library?view=books",
    label: "Books",
    Icon: IconBook,
    match: (_p, q) => q.get("view") === "books",
  },
  {
    href: "/library?view=emails",
    label: "Emails",
    Icon: IconMail,
    match: (_p, q) => q.get("view") === "emails",
  },
  {
    href: "/library?view=pdfs",
    label: "PDFs",
    Icon: IconPdf,
    match: (_p, q) => q.get("view") === "pdfs",
  },
  {
    href: "/library?view=videos",
    label: "Videos",
    Icon: IconPlay,
    match: (_p, q) => q.get("view") === "videos",
  },
  {
    href: "/library?view=podcasts",
    label: "Podcasts",
    Icon: IconPodcast,
    match: (_p, q) => q.get("view") === "podcasts",
  },
  {
    href: "/library?view=liked",
    label: "Liked",
    Icon: IconHeart,
    match: (_p, q) => q.get("view") === "liked",
  },
  {
    href: "/tags",
    label: "Tags",
    Icon: IconTag,
    match: (p) => p === "/tags" || p.startsWith("/tags/"),
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
  const [libraryOpen, setLibraryOpen] = useState(true);

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

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(LIBRARY_OPEN_KEY);
      if (raw !== null) setLibraryOpen(raw === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const folderId = searchParams.get("folderId");
  const isFolderActive = (id: string) => Boolean(folderId && folderId === id);
  const libraryChildActive = libraryNav.some((item) =>
    item.match(pathname, searchParams)
  );
  const trashActive =
    searchParams.get("view") === "trash" ||
    searchParams.get("view") === "archive" ||
    searchParams.get("archived") === "true";

  useEffect(() => {
    if (libraryChildActive) setLibraryOpen(true);
  }, [libraryChildActive]);

  const toggleLibrary = () => {
    setLibraryOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(LIBRARY_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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
          <span className="text-lg font-semibold text-amber-900 dark:text-amber-100">Menu</span>
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
          <div className="space-y-0.5">
            {primaryNav.map(({ href, label, Icon, match }) => {
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

          <div className="mt-6">
            <button
              type="button"
              onClick={toggleLibrary}
              aria-expanded={libraryOpen}
              className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800"
            >
              <span className="min-w-0 flex-1">Library</span>
              {libraryOpen ? (
                <IconChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
              ) : (
                <IconChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
              )}
            </button>
            {libraryOpen ? (
              <div className="space-y-0.5">
                {libraryNav.map(({ href, label, Icon, match }) => {
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
            ) : null}
          </div>

          <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase tracking-wide text-stone-400">
            Folders
          </p>
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

          <div className="mt-4 space-y-0.5">
            <NavLink
              href="/library?view=trash"
              label="Trash"
              active={trashActive}
              onNavigate={onClose}
              Icon={IconTrash}
            />
          </div>

          <form
            onSubmit={createFolder}
            className="mt-4 space-y-2 border-t border-stone-200 pt-4 dark:border-stone-800"
          >
            <label htmlFor="new-folder" className="sr-only">
              New folder name
            </label>
            <input
              id="new-folder"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="New folder"
              className="w-full rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm dark:border-stone-700 dark:bg-stone-900"
            />
            <button
              type="submit"
              disabled={creating || !newFolderName.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-900 px-3 py-2 text-sm font-medium text-amber-50 disabled:opacity-50 dark:bg-amber-100 dark:text-amber-950"
            >
              <IconFolderPlus className="h-4 w-4" />
              Create folder
            </button>
          </form>
        </nav>
      </aside>
    </div>
  );
}

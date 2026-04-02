"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ComponentType } from "react";
import {
  IconArchive,
  IconCog,
  IconFolder,
  IconFolderPlus,
  IconHeart,
  IconHome,
  IconNotes,
  IconPlay,
  IconSignOut,
  IconTag,
} from "@/components/ui-icons";

export type DrawerFolder = { id: string; name: string };

const navIconClass = "h-[1.125rem] w-[1.125rem] shrink-0 opacity-90";

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
  folders: DrawerFolder[];
};

const rowBase =
  "flex w-full items-center gap-3 border-l-2 py-2.5 pl-3 pr-2 text-left text-base leading-snug transition-colors";

function NavLink({
  href,
  label,
  active,
  Icon,
}: {
  href: string;
  label: string;
  active: boolean;
  Icon: ComponentType<{ className?: string }>;
}) {
  return (
    <li className="list-none">
      <Link
        href={href}
        className={`${rowBase} ${
          active
            ? "border-stone-800 font-medium text-stone-900 dark:border-stone-100 dark:text-stone-50"
            : "border-transparent text-stone-600 hover:bg-stone-200/50 dark:text-stone-400 dark:hover:bg-stone-800/40"
        }`}
      >
        <Icon className={navIconClass} />
        {label}
      </Link>
    </li>
  );
}

function NavRowButton({
  label,
  onClick,
  muted,
  Icon,
}: {
  label: string;
  onClick: () => void;
  muted?: boolean;
  Icon: ComponentType<{ className?: string }>;
}) {
  return (
    <li className="list-none">
      <button
        type="button"
        onClick={onClick}
        className={`${rowBase} border-transparent ${
          muted
            ? "text-stone-500 hover:bg-stone-200/50 dark:text-stone-500 dark:hover:bg-stone-800/40"
            : "text-stone-600 hover:bg-stone-200/50 dark:text-stone-400 dark:hover:bg-stone-800/40"
        }`}
      >
        <Icon className={navIconClass} />
        {label}
      </button>
    </li>
  );
}

export function AppSidebar({ folders }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [newFolderName, setNewFolderName] = useState("");
  const [creating, setCreating] = useState(false);

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
      }
    } finally {
      setCreating(false);
    }
  };

  const sectionLabel =
    "mb-1.5 mt-6 px-3 text-[13px] font-medium uppercase tracking-[0.1em] text-stone-400 first:mt-0 dark:text-stone-500";

  return (
    <aside
      className="flex h-full min-h-0 w-[min(100%,17rem)] shrink-0 flex-col bg-app-chrome sm:w-72 lg:w-80"
      aria-label="Library navigation"
    >
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto px-10 pb-6 pt-5 sm:pl-14 sm:pr-10 lg:pl-20 lg:pr-14 xl:pl-24 xl:pr-16">
        <p className={`${sectionLabel} mt-0`}>Library</p>
        <ul className="m-0 list-none space-y-px p-0">
          {mainNav.map(({ href, label, Icon, match }) => {
            const active = match(pathname, searchParams);
            return <NavLink key={href} href={href} label={label} active={active} Icon={Icon} />;
          })}
        </ul>

        <p className={sectionLabel}>Folders</p>
        <ul className="m-0 list-none space-y-px p-0">
          {folders.map((f) => (
            <NavLink
              key={f.id}
              href={`/library?folderId=${encodeURIComponent(f.id)}`}
              label={f.name}
              active={isFolderActive(f.id)}
              Icon={IconFolder}
            />
          ))}
        </ul>

        <form
          onSubmit={createFolder}
          className="mt-5 space-y-2 border-t border-stone-200/40 pt-4 dark:border-stone-800/60"
        >
          <label htmlFor="new-folder" className="sr-only">
            New folder name
          </label>
          <input
            id="new-folder"
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            placeholder="New folder"
            className="w-full border border-stone-300/80 bg-transparent px-2.5 py-2.5 text-base text-stone-800 placeholder:text-stone-400 dark:border-stone-600 dark:text-stone-200 dark:placeholder:text-stone-500"
          />
          <button
            type="submit"
            disabled={creating || !newFolderName.trim()}
            className="flex w-full items-center justify-center gap-2 border border-stone-300 bg-transparent py-2.5 text-base text-stone-700 hover:bg-stone-200/60 disabled:opacity-40 dark:border-stone-600 dark:text-stone-300 dark:hover:bg-stone-800/60"
          >
            <IconFolderPlus className={navIconClass} />
            {creating ? "Creating…" : "Add folder"}
          </button>
        </form>

        <ul className="mt-auto list-none space-y-px border-t border-stone-200/40 p-0 pt-4 dark:border-stone-800/60">
          <NavLink
            href="/settings"
            label="Settings"
            active={pathname.startsWith("/settings")}
            Icon={IconCog}
          />
          <NavRowButton
            label="Sign out"
            muted
            Icon={IconSignOut}
            onClick={() => signOut({ callbackUrl: "/" })}
          />
        </ul>
      </nav>
    </aside>
  );
}

"use client";

import gsap from "gsap";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { KeeprLogo } from "@/components/keepr-logo";
import { LibrarySearchBar } from "@/components/library-search-bar";
import { SidebarAddMenu } from "@/components/sidebar-add-menu";
import {
  IconArticle,
  IconBook,
  IconChevronDown,
  IconChevronRight,
  IconCog,
  IconFolder,
  IconHeart,
  IconHome,
  IconMail,
  IconNotes,
  IconPdf,
  IconPlay,
  IconPodcast,
  IconPlusSmall,
  IconSearch,
  IconSignOut,
  IconTag,
  IconTrash,
  IconUser,
} from "@/components/ui-icons";
import { useContainRegionWheel } from "@/lib/contain-region-wheel";

export type DrawerFolder = { id: string; name: string };

const LIBRARY_OPEN_KEY = "keepr-sidebar-library-open";
const SIDEBAR_OPEN_KEY = "keepr-left-sidebar-open";
const navIconClass = "h-[1.125rem] w-[1.125rem] shrink-0 opacity-90";

const OPEN_WIDTH = 256;
const COLLAPSED_WIDTH = 48;

function IconSidebarPanel({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8.5 4.5v15" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

const primaryNav: {
  href: string;
  label: string;
  Icon: ComponentType<{ className?: string }>;
  match: (p: string, q: URLSearchParams) => boolean;
}[] = [
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
    href: "/check",
    label: "Advanced AI Scan",
    Icon: IconSearch,
    match: (p) =>
      p === "/check" || p.startsWith("/check/") || p === "/scan" || p.startsWith("/scan/"),
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
  folders: DrawerFolder[];
};

function NavLink({
  href,
  label,
  active,
  Icon,
  chevron,
}: {
  href: string;
  label: string;
  active: boolean;
  Icon: ComponentType<{ className?: string }>;
  chevron?: boolean;
}) {
  return (
    <li className="list-none">
      <Link
        href={href}
        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] transition-colors ${
          active
            ? "bg-[color:var(--keepr-elevated)] font-medium text-white"
            : "text-[color:var(--keepr-muted)] hover:bg-[color:var(--keepr-elevated-hover)] hover:text-white"
        }`}
      >
        <Icon className={navIconClass} />
        <span className="min-w-0 flex-1 truncate">{label}</span>
        {chevron && active && <IconChevronRight className="h-4 w-4 shrink-0 opacity-70" />}
      </Link>
    </li>
  );
}

function readLibraryOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(LIBRARY_OPEN_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

function readSidebarOpen(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(SIDEBAR_OPEN_KEY);
    if (raw === null) return true;
    return raw === "1";
  } catch {
    return true;
  }
}

export function AppSidebar({ folders }: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [hydrated, setHydrated] = useState(false);

  const shellRef = useRef<HTMLElement | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  useContainRegionWheel(shellRef);

  const folderId = searchParams.get("folderId");
  const foldersSectionActive =
    pathname.startsWith("/folders") || Boolean(folderId);

  const libraryChildActive = libraryNav.some((item) =>
    item.match(pathname, searchParams)
  );
  const trashActive =
    searchParams.get("view") === "trash" ||
    searchParams.get("view") === "archive" ||
    searchParams.get("archived") === "true";

  useEffect(() => {
    setLibraryOpen(readLibraryOpen());
    setSidebarOpen(readSidebarOpen());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (libraryChildActive) setLibraryOpen(true);
  }, [libraryChildActive]);

  useLayoutEffect(() => {
    const shell = shellRef.current;
    if (!shell || !hydrated) return;

    tweenRef.current?.kill();
    const body = bodyRef.current;
    const targetWidth = sidebarOpen ? OPEN_WIDTH : COLLAPSED_WIDTH;

    if (sidebarOpen) {
      tweenRef.current = gsap.to(shell, {
        width: targetWidth,
        duration: 0.42,
        ease: "power3.out",
        overwrite: true,
        onStart: () => {
          shell.setAttribute("aria-hidden", "false");
        },
      });
      if (body) {
        gsap.fromTo(
          body,
          { autoAlpha: 0, x: -16 },
          { autoAlpha: 1, x: 0, duration: 0.34, delay: 0.1, ease: "power2.out" }
        );
      }
    } else {
      if (body) gsap.to(body, { autoAlpha: 0, x: -12, duration: 0.16, ease: "power1.in" });
      tweenRef.current = gsap.to(shell, {
        width: targetWidth,
        duration: 0.38,
        ease: "power3.inOut",
        overwrite: true,
        onComplete: () => {
          shell.setAttribute("aria-hidden", "true");
        },
      });
    }

    return () => {
      tweenRef.current?.kill();
    };
  }, [sidebarOpen, hydrated]);

  const toggleSidebar = () => {
    setSidebarOpen((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_OPEN_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  };

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

  const createFolder = async () => {
    if (creating) return;
    const name = window.prompt("Folder name");
    if (!name?.trim()) return;
    setCreating(true);
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
    <aside
      ref={shellRef}
      className="relative hidden h-full min-h-0 shrink-0 overflow-hidden overscroll-contain bg-keepr md:block"
      style={{ width: sidebarOpen ? OPEN_WIDTH : COLLAPSED_WIDTH }}
      aria-label="Library navigation"
    >
      {/* Collapsed rail: reopen control stays visible */}
      <div
        className={`absolute inset-y-0 left-0 z-10 flex w-12 flex-col items-center ${
          sidebarOpen ? "pointer-events-none opacity-0" : "opacity-100"
        }`}
      >
        <div className="flex h-14 items-center justify-center">
          <button
            type="button"
            onClick={toggleSidebar}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-[color:var(--keepr-muted)] hover:bg-[color:var(--keepr-elevated)] hover:text-keepr"
            title="Show left sidebar"
            aria-label="Show left sidebar"
            aria-pressed={false}
          >
            <IconSidebarPanel className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={bodyRef}
        className={`flex h-full w-64 flex-col ${sidebarOpen ? "" : "pointer-events-none"}`}
      >
        <div className="shrink-0 space-y-3 px-4 pb-2">
          <div className="flex h-14 items-center gap-1.5">
            <Link
              href="/library"
              className="min-w-0 flex-1 truncate text-lg tracking-tight"
            >
              <KeeprLogo className="text-keepr text-[1.1rem] sm:text-[1.2rem]" />
            </Link>
            <button
              type="button"
              onClick={toggleSidebar}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[color:var(--keepr-muted)] hover:bg-[color:var(--keepr-elevated)] hover:text-keepr"
              title="Hide left sidebar"
              aria-label="Hide left sidebar"
              aria-pressed={true}
            >
              <IconSidebarPanel className="h-5 w-5" />
            </button>
            <SidebarAddMenu />
          </div>
          <Suspense
            fallback={<div className="h-10 w-full rounded-full bg-[color:var(--keepr-elevated)]" />}
          >
            <LibrarySearchBar inputId="library-search-sidebar" />
          </Suspense>
        </div>

        <nav className="scrollbar-hide flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-4 pb-4 pt-2">
          <ul className="m-0 list-none space-y-0.5 p-0">
            {primaryNav.map(({ href, label, Icon, match }) => (
              <NavLink
                key={href}
                href={href}
                label={label}
                active={match(pathname, searchParams)}
                Icon={Icon}
                chevron={label === "Folders"}
              />
            ))}
          </ul>

          <div className="mt-6">
            <button
              type="button"
              onClick={toggleLibrary}
              aria-expanded={libraryOpen}
              className="mb-1.5 flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--keepr-faint)] transition-colors hover:bg-[color:var(--keepr-elevated-hover)] hover:text-[color:var(--keepr-muted)]"
            >
              <span className="min-w-0 flex-1">Library</span>
              {libraryOpen ? (
                <IconChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
              ) : (
                <IconChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
              )}
            </button>
            {libraryOpen ? (
              <ul className="m-0 list-none space-y-0.5 p-0">
                {libraryNav.map(({ href, label, Icon, match }) => (
                  <NavLink
                    key={href}
                    href={href}
                    label={label}
                    active={match(pathname, searchParams)}
                    Icon={Icon}
                  />
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mb-1.5 mt-6 flex items-center justify-between px-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[color:var(--keepr-faint)]">
              All folders
            </p>
            <button
              type="button"
              onClick={() => void createFolder()}
              disabled={creating}
              className="rounded p-1 text-[color:var(--keepr-muted)] hover:bg-[color:var(--keepr-elevated)] hover:text-white disabled:opacity-40"
              aria-label="Create folder"
              title="Create folder"
            >
              <IconPlusSmall className="h-4 w-4" />
            </button>
          </div>
          <ul className="m-0 list-none space-y-0.5 p-0">
            {folders.length === 0 && (
              <li className="px-3 py-2 text-sm text-[color:var(--keepr-faint)]">No folders yet</li>
            )}
            {folders.map((f) => (
              <NavLink
                key={f.id}
                href={`/library?folderId=${encodeURIComponent(f.id)}`}
                label={f.name}
                active={Boolean(folderId && folderId === f.id)}
                Icon={IconFolder}
              />
            ))}
            {foldersSectionActive && folders.length > 0 && (
              <NavLink
                href="/folders"
                label="View all"
                active={pathname.startsWith("/folders")}
                Icon={IconFolder}
              />
            )}
          </ul>

          <ul className="mt-6 list-none space-y-0.5 p-0">
            <NavLink
              href="/library?view=trash"
              label="Trash"
              active={trashActive}
              Icon={IconTrash}
            />
          </ul>

          <ul className="mt-auto list-none space-y-0.5 border-t border-[color:var(--keepr-border)] p-0 pt-4">
            <NavLink
              href="/account"
              label="Account"
              active={pathname.startsWith("/account") || pathname.startsWith("/profile")}
              Icon={IconUser}
            />
            <NavLink
              href="/settings"
              label="Settings"
              active={pathname.startsWith("/settings")}
              Icon={IconCog}
            />
            <li className="list-none">
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[15px] text-[color:var(--keepr-muted)] transition-colors hover:bg-[color:var(--keepr-elevated-hover)] hover:text-white"
              >
                <IconSignOut className={navIconClass} />
                Sign out
              </button>
            </li>
          </ul>
        </nav>
      </div>
    </aside>
  );
}

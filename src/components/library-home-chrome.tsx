import Link from "next/link";

export function LibraryHomeTabs({ active }: { active: "for-you" | "liked" | "recent" }) {
  const tabs: { id: typeof active; label: string; href: string }[] = [
    { id: "for-you", label: "For you", href: "/library" },
    { id: "liked", label: "Liked", href: "/library?view=liked" },
    { id: "recent", label: "Recent", href: "/library?tab=recent" },
  ];

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-white text-black"
                : "bg-[color:var(--keepr-elevated)] text-[color:var(--keepr-muted)] hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function LibraryKindTabs({
  active,
}: {
  active: "all" | "articles" | "videos";
}) {
  const tabs: { id: typeof active; label: string; href: string }[] = [
    { id: "all", label: "All", href: "/library" },
    { id: "articles", label: "Articles", href: "/library?view=articles" },
    { id: "videos", label: "Videos", href: "/library?view=videos" },
  ];

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((t) => {
        const isActive = t.id === active;
        return (
          <Link
            key={t.id}
            href={t.href}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-white text-black"
                : "bg-transparent text-white hover:bg-[color:var(--keepr-elevated)]"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}

export function LibraryActionTiles() {
  return (
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link
        href="/add"
        className="flex items-center gap-4 rounded-xl bg-[color:var(--keepr-elevated)] px-5 py-4 transition hover:bg-[color:var(--keepr-elevated-hover)]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white">
          +
        </span>
        <div>
          <p className="font-medium text-white">Add a link</p>
          <p className="text-sm text-[color:var(--keepr-muted)]">Save an article or video URL</p>
        </div>
      </Link>
      <Link
        href="/folders"
        className="flex items-center gap-4 rounded-xl bg-[color:var(--keepr-elevated)] px-5 py-4 transition hover:bg-[color:var(--keepr-elevated-hover)]"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-lg text-white">
          ▦
        </span>
        <div>
          <p className="font-medium text-white">Browse folders</p>
          <p className="text-sm text-[color:var(--keepr-muted)]">Organize your library</p>
        </div>
      </Link>
    </div>
  );
}

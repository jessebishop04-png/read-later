"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { AppSidebar, type DrawerFolder } from "@/components/app-sidebar";
import { CustomizeStylesControl } from "@/components/customize-styles";
import { KeeprLogo } from "@/components/keepr-logo";
import { LibrarySearchBar } from "@/components/library-search-bar";
import type { NavUser } from "@/components/nav-profile-menu";
import { useOptionalReadChrome } from "@/components/read-chrome-context";
import { ReadNavActions } from "@/components/read-nav-actions";
import { ReadRightSidebar } from "@/components/read-right-sidebar";
import { ScanRightPanel } from "@/components/scan/scan-right-panel";

type Props = {
  folders: DrawerFolder[];
  user: NavUser | null;
  children: React.ReactNode;
};

function SidebarFallback() {
  return (
    <aside className="hidden h-full w-60 shrink-0 bg-keepr md:block" aria-hidden />
  );
}

const mobileLinks = [
  { href: "/library", label: "Home" },
  { href: "/review", label: "Review" },
  { href: "/check", label: "Advanced AI Scan" },
  { href: "/account", label: "Account" },
];

function ShellHeader() {
  const pathname = usePathname();
  const isCheck =
    pathname === "/check" ||
    Boolean(pathname?.startsWith("/check/")) ||
    pathname === "/scan" ||
    Boolean(pathname?.startsWith("/scan/"));

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 bg-[color:var(--keepr-bg)]/95 px-4 backdrop-blur-sm sm:px-6">
      <div className="flex shrink-0 items-center gap-1">
        <Link
          href="/library"
          className="shrink-0 md:hidden"
        >
          <KeeprLogo className="text-[16px] text-[color:var(--keepr-text)]" />
        </Link>
        <CustomizeStylesControl />
      </div>
      {isCheck ? (
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight text-keepr sm:text-lg">
          Advanced AI Scan
        </h1>
      ) : (
        <>
          <div className="min-w-0 flex-1 md:hidden">
            <Suspense
              fallback={
                <div className="h-10 w-full rounded-full bg-[color:var(--keepr-elevated)]" />
              }
            >
              <LibrarySearchBar inputId="library-search-mobile" />
            </Suspense>
          </div>
          <div className="ml-auto hidden flex-1 md:block" aria-hidden />
        </>
      )}
      <div className="flex shrink-0 items-center gap-2">
        <ReadNavActions />
      </div>
    </header>
  );
}

export function AppShell({ folders, children }: Props) {
  const pathname = usePathname();
  const isRead = pathname?.startsWith("/read/") ?? false;
  const isCheck =
    pathname === "/check" ||
    Boolean(pathname?.startsWith("/check/")) ||
    pathname === "/scan" ||
    Boolean(pathname?.startsWith("/scan/"));
  const fullBleed = isRead || isCheck;
  const readCtx = useOptionalReadChrome();
  const panelItem = isRead ? readCtx?.panelItem ?? null : null;
  const showScanPanel = isCheck && Boolean(readCtx?.scanPanel);

  return (
    <div className="flex h-dvh min-h-0 flex-col overflow-hidden bg-keepr text-keepr">
      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<SidebarFallback />}>
          <AppSidebar folders={folders} />
        </Suspense>

        {/*
          One scrollport for the main column so the scrollbar stays on the far right.
          Right panel is sticky inside it; each sidebar keeps its own overflow for hover-scroll.
        */}
        <div className="relative min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-y-contain">
          <div className="flex min-h-full items-start">
            <div className="flex min-h-full min-w-0 flex-1 flex-col">
              <ShellHeader />

              {!fullBleed ? (
                <nav
                  className="flex gap-1 overflow-x-auto px-4 pb-2 md:hidden"
                  aria-label="Mobile"
                >
                  {mobileLinks.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      className="shrink-0 rounded-full bg-[color:var(--keepr-elevated)] px-3 py-1.5 text-xs text-[color:var(--keepr-muted)]"
                    >
                      {l.label}
                    </Link>
                  ))}
                </nav>
              ) : null}

              <div
                className={
                  fullBleed
                    ? "min-w-0 flex-1"
                    : "flex-1 px-4 pb-10 pt-2 sm:px-6 lg:px-8"
                }
              >
                {children}
              </div>
            </div>

            {panelItem ? <ReadRightSidebar item={panelItem} /> : null}
            {showScanPanel ? <ScanRightPanel /> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Suspense } from "react";
import { AppSidebar, type DrawerFolder } from "@/components/app-sidebar";
import { LibrarySearchBar } from "@/components/library-search-bar";
import { NavProfileMenu, type NavUser } from "@/components/nav-profile-menu";
import { ReadNavActions } from "@/components/read-nav-actions";
import { AppearanceMenu } from "@/components/appearance-menu";

type Props = {
  folders: DrawerFolder[];
  user: NavUser | null;
  children: React.ReactNode;
};

function SidebarFallback() {
  return (
    <aside
      className="h-full min-h-0 w-[min(100%,17rem)] shrink-0 bg-app-chrome sm:w-72 lg:w-80"
      aria-hidden
    />
  );
}

export function AppShell({ folders, user, children }: Props) {
  return (
    <div className="flex min-h-screen flex-col bg-app-chrome">
      <header className="sticky top-0 z-30 w-full shrink-0 border-b border-[color:var(--app-chrome-border)] bg-app-header backdrop-blur">
        {/* Horizontal padding matches AppSidebar nav so “Read Later” lines up with sidebar labels */}
        <div className="flex h-14 w-full items-center gap-3 px-10 sm:pl-14 sm:pr-10 lg:pl-20 lg:pr-14 xl:pl-24 xl:pr-16">
          <Link
            href="/library"
            className="shrink-0 text-[15px] font-medium tracking-tight text-stone-800 dark:text-stone-100"
          >
            Read Later
          </Link>
          <div className="min-w-0 flex-1">
            <Suspense
              fallback={
                <div className="mx-auto h-9 w-full max-w-md rounded-lg bg-stone-200/60 dark:bg-stone-800/60" />
              }
            >
              <LibrarySearchBar />
            </Suspense>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <ReadNavActions />
            <AppearanceMenu />
            {user && <NavProfileMenu user={user} />}
          </div>
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <Suspense fallback={<SidebarFallback />}>
          <AppSidebar folders={folders} />
        </Suspense>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl flex-1 px-8 py-8 sm:px-12 lg:px-20">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

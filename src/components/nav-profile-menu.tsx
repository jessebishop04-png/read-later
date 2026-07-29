"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { IconCog, IconSignOut, IconUser } from "@/components/ui-icons";

export type NavUser = {
  name: string | null;
  email: string | null;
  image: string | null;
};

function initials(name: string | null, email: string | null) {
  const n = name?.trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const e = email?.trim();
  if (e) return e.slice(0, 2).toUpperCase();
  return "?";
}

const menuItem =
  "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-white hover:bg-white/5";

const menuIcon = "h-4 w-4 shrink-0 opacity-90";

type Props = {
  user: NavUser;
};

export function NavProfileMenu({ user }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const label = initials(user.name, user.email);
  const display = user.name?.trim() || user.email?.trim() || "Account";

  useEffect(() => {
    setImgFailed(false);
  }, [user.image]);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open, close]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, close]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[color:var(--keepr-elevated)] text-xs font-semibold text-white transition hover:bg-[color:var(--keepr-elevated-hover)]"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${display}`}
        onClick={() => setOpen((o) => !o)}
      >
        {user.image && !imgFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.image}
            alt=""
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          label
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-56 rounded-xl bg-[color:var(--keepr-elevated)] py-1 shadow-xl ring-1 ring-white/10"
          role="menu"
          aria-label="Account"
        >
          <div className="border-b border-white/10 px-3 py-2">
            <p className="truncate text-sm font-medium text-white">{display}</p>
            {user.email && (
              <p className="truncate text-xs text-[color:var(--keepr-muted)]">{user.email}</p>
            )}
          </div>
          <Link href="/account" role="menuitem" className={menuItem} onClick={close}>
            <IconUser className={menuIcon} />
            Account
          </Link>
          <Link href="/settings" role="menuitem" className={menuItem} onClick={close}>
            <IconCog className={menuIcon} />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className={`${menuItem} w-full text-red-400`}
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <IconSignOut className={menuIcon} />
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

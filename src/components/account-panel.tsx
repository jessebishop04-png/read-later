"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  IconCog,
  IconSignOut,
  IconUser,
} from "@/components/ui-icons";

type Props = {
  initialName: string | null;
  initialImage: string | null;
  email: string | null;
  hasPasswordLogin: boolean;
};

export function AccountPanel({
  initialName,
  initialImage,
  email,
  hasPasswordLogin,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName ?? "");
  const [image, setImage] = useState(initialImage);
  const [editingInfo, setEditingInfo] = useState(false);
  const [showPwForm, setShowPwForm] = useState(false);
  const [busyName, setBusyName] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyPw, setBusyPw] = useState(false);
  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  useEffect(() => {
    setName(initialName ?? "");
  }, [initialName]);

  useEffect(() => {
    setImage(initialImage);
  }, [initialImage]);

  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameMsg(null);
    setBusyName(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: name.trim() === "" ? null : name.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setNameMsg(data.error ?? "Could not save");
        return;
      }
      setNameMsg("Saved");
      setEditingInfo(false);
      router.refresh();
    } finally {
      setBusyName(false);
    }
  };

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusyAvatar(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { image?: string };
      if (res.ok && typeof data.image === "string") {
        setImage(data.image);
        router.refresh();
      }
    } finally {
      setBusyAvatar(false);
    }
  };

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg("New passwords do not match");
      return;
    }
    setBusyPw(true);
    try {
      const res = await fetch("/api/me/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword: currentPw, newPassword: newPw }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setPwMsg(data.error ?? "Could not update password");
        return;
      }
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setPwMsg("Password updated");
      setShowPwForm(false);
    } finally {
      setBusyPw(false);
    }
  };

  const navItem =
    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100";
  const navActive = `${navItem} bg-neutral-100 font-medium text-black`;

  return (
    <div className="keepr-account p-6 sm:p-10">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[220px_1fr]">
        <aside>
          <div className="flex flex-col items-start">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="h-24 w-24 overflow-hidden rounded-full bg-neutral-200"
              aria-label="Change avatar"
              disabled={busyAvatar}
            >
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-neutral-400">
                  <IconUser className="h-10 w-10" />
                </span>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={onFileChange}
            />
            <p className="mt-4 break-all text-sm font-semibold text-black">{email}</p>
            <p className="mt-1 text-sm text-neutral-500">Keepr</p>
          </div>

          <nav className="mt-8 space-y-1" aria-label="Account">
            <Link href="/account" className={navActive}>
              <IconUser className="h-4 w-4" />
              Profile
            </Link>
            <Link href="/settings" className={navItem}>
              <IconCog className="h-4 w-4" />
              Settings
            </Link>
            <button
              type="button"
              className={`${navItem} w-full text-left`}
              onClick={() => signOut({ callbackUrl: "/" })}
            >
              <IconSignOut className="h-4 w-4" />
              Log out
            </button>
          </nav>
        </aside>

        <div className="space-y-8">
          <section className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-black">Log In Details</h2>
            <div className="mt-6 space-y-6">
              <div>
                <p className="text-sm font-semibold text-black">Log in name</p>
                <p className="mt-1 text-neutral-800">{email ?? "—"}</p>
                <p className="mt-2 rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-600">
                  This is the email you use to access your Keepr account.
                </p>
              </div>
              <div>
                <p className="text-sm font-semibold text-black">Current Password</p>
                <p className="mt-1 tracking-widest text-neutral-800">**********</p>
                {hasPasswordLogin && !showPwForm && (
                  <button
                    type="button"
                    onClick={() => setShowPwForm(true)}
                    className="mt-4 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                  >
                    Change Password
                  </button>
                )}
                {hasPasswordLogin && showPwForm && (
                  <form className="mt-4 max-w-sm space-y-3" onSubmit={changePassword}>
                    <input
                      type="password"
                      placeholder="Current password"
                      autoComplete="current-password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      required
                    />
                    <input
                      type="password"
                      placeholder="New password (min 8)"
                      autoComplete="new-password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      minLength={8}
                      required
                    />
                    <input
                      type="password"
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                      minLength={8}
                      required
                    />
                    {pwMsg && (
                      <p className={`text-sm ${pwMsg.includes("updated") ? "text-green-700" : "text-red-600"}`}>
                        {pwMsg}
                      </p>
                    )}
                    <div className="flex gap-2">
                      <button
                        type="submit"
                        disabled={busyPw}
                        className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                      >
                        {busyPw ? "Updating…" : "Save password"}
                      </button>
                      <button
                        type="button"
                        className="rounded-lg px-4 py-2.5 text-sm text-neutral-600"
                        onClick={() => setShowPwForm(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
                {!hasPasswordLogin && (
                  <p className="mt-2 text-sm text-neutral-500">
                    This account does not use a password for sign-in.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-white p-6 sm:p-8">
            <h2 className="text-2xl font-bold text-black">General Info</h2>
            {!editingInfo ? (
              <div className="mt-6 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-black">Full Name</p>
                  <p className="mt-1 text-neutral-800">{name.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-black">Email</p>
                  <p className="mt-1 text-neutral-800">{email ?? "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingInfo(true)}
                  className="mt-2 rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
                >
                  Edit Information
                </button>
              </div>
            ) : (
              <form className="mt-6 max-w-sm space-y-3" onSubmit={saveName}>
                <label className="block text-sm font-semibold text-black">
                  Full Name
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm font-normal"
                    placeholder="Your name"
                  />
                </label>
                {nameMsg && <p className="text-sm text-neutral-600">{nameMsg}</p>}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={busyName}
                    className="rounded-lg bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
                  >
                    {busyName ? "Saving…" : "Save"}
                  </button>
                  <button
                    type="button"
                    className="rounded-lg px-4 py-2.5 text-sm text-neutral-600"
                    onClick={() => {
                      setEditingInfo(false);
                      setName(initialName ?? "");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

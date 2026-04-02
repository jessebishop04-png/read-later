"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type Props = {
  initialName: string | null;
  initialImage: string | null;
  email: string | null;
  hasPasswordLogin: boolean;
};

const section =
  "rounded-xl border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900/40";
const label = "text-xs font-medium uppercase tracking-wide text-stone-500";
const input =
  "mt-1 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm dark:border-stone-600 dark:bg-stone-950";
const btnPrimary =
  "rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800 disabled:opacity-50 dark:bg-amber-600";
const btnSecondary =
  "rounded-lg border border-stone-300 px-4 py-2 text-sm dark:border-stone-600 disabled:opacity-50";

export function ProfileAccountForms({
  initialName,
  initialImage,
  email,
  hasPasswordLogin,
}: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initialName ?? "");
  const [image, setImage] = useState(initialImage);
  const [imageUrl, setImageUrl] = useState("");
  const [busyName, setBusyName] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyUrl, setBusyUrl] = useState(false);
  const [busyRemove, setBusyRemove] = useState(false);
  const [busyPw, setBusyPw] = useState(false);

  const [nameMsg, setNameMsg] = useState<string | null>(null);
  const [avatarMsg, setAvatarMsg] = useState<string | null>(null);
  const [urlMsg, setUrlMsg] = useState<string | null>(null);
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

  const refresh = () => router.refresh();

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
      refresh();
    } finally {
      setBusyName(false);
    }
  };

  const onPickFile = () => fileRef.current?.click();

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setAvatarMsg(null);
    setBusyAvatar(true);
    try {
      const fd = new FormData();
      fd.set("file", file);
      const res = await fetch("/api/me/avatar", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; image?: string };
      if (!res.ok) {
        setAvatarMsg(data.error ?? "Upload failed");
        return;
      }
      if (typeof data.image === "string") setImage(data.image);
      setAvatarMsg("Avatar updated");
      refresh();
    } finally {
      setBusyAvatar(false);
    }
  };

  const saveImageUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlMsg(null);
    setBusyUrl(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: imageUrl.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setUrlMsg(data.error ?? "Could not save URL");
        return;
      }
      setImage(imageUrl.trim());
      setImageUrl("");
      setUrlMsg("Saved");
      refresh();
    } finally {
      setBusyUrl(false);
    }
  };

  const removeAvatar = async () => {
    setAvatarMsg(null);
    setBusyRemove(true);
    try {
      const res = await fetch("/api/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ image: null }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setAvatarMsg(data.error ?? "Could not remove");
        return;
      }
      setImage(null);
      setAvatarMsg("Avatar removed");
      refresh();
    } finally {
      setBusyRemove(false);
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
    } finally {
      setBusyPw(false);
    }
  };

  return (
    <div className="mt-10 space-y-8">
      <section className={section} aria-labelledby="avatar-heading">
        <h2 id="avatar-heading" className={label}>
          Avatar
        </h2>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-stone-200 bg-stone-100 dark:border-stone-700 dark:bg-stone-800">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-stone-400">
                No photo
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              className="sr-only"
              onChange={onFileChange}
            />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnPrimary} disabled={busyAvatar} onClick={onPickFile}>
                {busyAvatar ? "Uploading…" : "Upload image"}
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={busyRemove || !image}
                onClick={() => void removeAvatar()}
              >
                Remove
              </button>
            </div>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              JPEG, PNG, GIF, or WebP, up to 2 MB. Or set a URL below.
            </p>
            {avatarMsg && (
              <p className="text-sm text-stone-600 dark:text-stone-300" role="status">
                {avatarMsg}
              </p>
            )}
          </div>
        </div>

        <form className="mt-6 border-t border-stone-100 pt-6 dark:border-stone-800" onSubmit={saveImageUrl}>
          <label htmlFor="avatar-url" className={label}>
            Image URL (optional)
          </label>
          <input
            id="avatar-url"
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://…"
            className={input}
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="submit" className={btnPrimary} disabled={busyUrl || !imageUrl.trim()}>
              {busyUrl ? "Saving…" : "Save URL"}
            </button>
          </div>
          {urlMsg && (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300" role="status">
              {urlMsg}
            </p>
          )}
        </form>
      </section>

      <section className={section} aria-labelledby="name-heading">
        <h2 id="name-heading" className={label}>
          Display name
        </h2>
        <form className="mt-4" onSubmit={saveName}>
          <label htmlFor="display-name" className="sr-only">
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={input}
            placeholder="Your name"
          />
          <button type="submit" className={`${btnPrimary} mt-3`} disabled={busyName}>
            {busyName ? "Saving…" : "Save name"}
          </button>
          {nameMsg && (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-300" role="status">
              {nameMsg}
            </p>
          )}
        </form>
      </section>

      <section className={section}>
        <p className={label}>Email</p>
        <p className="mt-2 text-stone-900 dark:text-stone-100">{email ?? "—"}</p>
        <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">Email cannot be changed here.</p>
      </section>

      {hasPasswordLogin && (
        <section className={section} aria-labelledby="pw-heading">
          <h2 id="pw-heading" className={label}>
            Password
          </h2>
          <form className="mt-4 space-y-3" onSubmit={changePassword}>
            <div>
              <label htmlFor="current-pw" className="text-xs text-stone-500">
                Current password
              </label>
              <input
                id="current-pw"
                type="password"
                autoComplete="current-password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label htmlFor="new-pw" className="text-xs text-stone-500">
                New password (min 8 characters)
              </label>
              <input
                id="new-pw"
                type="password"
                autoComplete="new-password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label htmlFor="confirm-pw" className="text-xs text-stone-500">
                Confirm new password
              </label>
              <input
                id="confirm-pw"
                type="password"
                autoComplete="new-password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className={input}
              />
            </div>
            {pwMsg && (
              <p
                className={`text-sm ${pwMsg.includes("updated") ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}
                role="status"
              >
                {pwMsg}
              </p>
            )}
            <button type="submit" className={btnPrimary} disabled={busyPw}>
              {busyPw ? "Updating…" : "Change password"}
            </button>
          </form>
        </section>
      )}

      {!hasPasswordLogin && (
        <section className={section}>
          <p className={label}>Password</p>
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
            This account does not use a password for sign-in.
          </p>
        </section>
      )}
    </div>
  );
}

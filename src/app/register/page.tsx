"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { KeeprLogo } from "@/components/keepr-logo";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Registration failed");
        return;
      }
      const sign = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (sign?.error) {
        router.push("/login");
        return;
      }
      router.push("/library");
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <KeeprLogo className="text-2xl text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Create your Keepr</h1>
        <form onSubmit={submit} className="mt-8 space-y-3 text-left">
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="w-full rounded-xl border-0 bg-[#1a1a1a] px-4 py-3.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/25"
          />
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="w-full rounded-xl border-0 bg-[#1a1a1a] px-4 py-3.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/25"
          />
          <input
            id="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 characters)"
            className="w-full rounded-xl border-0 bg-[#1a1a1a] px-4 py-3.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/25"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-neutral-400 py-3.5 font-semibold text-black hover:bg-neutral-300 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Continue"}
          </button>
        </form>
        <p className="my-6 text-sm text-neutral-500">or</p>
        <Link
          href="/login"
          className="block w-full rounded-xl bg-white py-3.5 text-center font-semibold text-black hover:bg-neutral-100"
        >
          Log in
        </Link>
        <Link href="/" className="mt-8 inline-block text-sm text-neutral-500 hover:text-white">
          ← Keepr
        </Link>
      </div>
    </div>
  );
}

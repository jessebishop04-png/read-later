"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { KeeprLogo } from "@/components/keepr-logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/library";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password,
        redirect: false,
      });
      if (res?.error) {
        setError("Invalid email or password.");
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input
        id="email"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        className="w-full rounded-xl border-0 bg-[#1a1a1a] px-4 py-3.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/25"
      />
      <input
        id="password"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        className="w-full rounded-xl border-0 bg-[#1a1a1a] px-4 py-3.5 text-white placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-white/25"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-neutral-400 py-3.5 font-semibold text-black hover:bg-neutral-300 disabled:opacity-50"
      >
        {loading ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm text-center">
        <div className="mb-6 flex justify-center">
          <KeeprLogo className="text-2xl text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Sign up or log in</h1>
        <div className="mt-8 text-left">
          <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-[#1a1a1a]" />}>
            <LoginForm />
          </Suspense>
        </div>
        <p className="my-6 text-sm text-neutral-500">or</p>
        <Link
          href="/register"
          className="block w-full rounded-xl bg-white py-3.5 text-center font-semibold text-black hover:bg-neutral-100"
        >
          Create an account
        </Link>
        <Link href="/" className="mt-8 inline-block text-sm text-neutral-500 hover:text-white">
          ← Keepr
        </Link>
      </div>
    </div>
  );
}

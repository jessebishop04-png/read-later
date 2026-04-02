import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50/80 to-stone-100 dark:from-stone-900 dark:to-stone-950">
      <header className="mx-auto flex max-w-3xl items-center justify-between px-6 py-8">
        <span className="font-serif text-xl font-semibold text-stone-800 dark:text-stone-100">
          Read Later
        </span>
        <div className="flex gap-3 text-sm">
          <Link
            href="/login"
            className="rounded-lg px-3 py-2 text-stone-600 hover:bg-stone-200/80 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Log in
          </Link>
          <Link
            href="/register"
            className="rounded-lg bg-amber-700 px-3 py-2 font-medium text-white hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Sign up
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 pb-24 pt-12">
        <p className="font-serif text-4xl font-semibold leading-tight text-stone-900 dark:text-stone-50 md:text-5xl">
          Your calm place for everything worth reading later.
        </p>
        <p className="mt-6 text-lg leading-relaxed text-stone-600 dark:text-stone-400">
          Save articles, pages, and video links from the web. We strip the clutter so you can
          focus. Organize with tags, highlight what matters, and open your library on any
          device—even when you are offline.
        </p>
        <ul className="mt-10 space-y-3 text-stone-700 dark:text-stone-300">
          <li className="flex gap-2">
            <span className="text-amber-600 dark:text-amber-400">✓</span>
            Paste a URL or use the browser extension to capture the current tab.
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600 dark:text-amber-400">✓</span>
            Clean reading view powered by Mozilla Readability.
          </li>
          <li className="flex gap-2">
            <span className="text-amber-600 dark:text-amber-400">✓</span>
            Tags, archive, highlights, and optional offline access via PWA.
          </li>
        </ul>
        <div className="mt-12 flex flex-wrap gap-4">
          <Link
            href="/register"
            className="rounded-xl bg-amber-700 px-6 py-3 font-medium text-white shadow-sm hover:bg-amber-800 dark:bg-amber-600 dark:hover:bg-amber-500"
          >
            Create free account
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-stone-300 px-6 py-3 font-medium text-stone-800 hover:bg-stone-100 dark:border-stone-600 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            I already have an account
          </Link>
        </div>
      </main>
    </div>
  );
}

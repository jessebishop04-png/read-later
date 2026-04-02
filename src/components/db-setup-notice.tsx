import Link from "next/link";

export function DbSetupNotice() {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-stone-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-stone-100">
      <p className="font-serif text-xl font-semibold text-amber-950 dark:text-amber-100">
        Database needs updating
      </p>
      <p className="mt-2 text-sm leading-relaxed text-stone-700 dark:text-stone-300">
        The app was updated but your local database file does not have the latest tables yet. That
        triggers a server error—Next.js then shows a technical screen that looks like &quot;code.&quot;
      </p>
      <p className="mt-4 text-sm font-medium text-stone-800 dark:text-stone-200">
        Fix (run once in the <code className="rounded bg-white/80 px-1 dark:bg-stone-900">read-later</code>{" "}
        folder):
      </p>
      <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-stone-700 dark:text-stone-300">
        <li>
          Open a terminal where <strong>Node/npm</strong> works (or use{" "}
          <strong>run-dev.bat</strong> from the project).
        </li>
        <li>
          Run: <code className="rounded bg-white/80 px-1 dark:bg-stone-900">npx prisma migrate deploy</code>
        </li>
        <li>
          Then: <code className="rounded bg-white/80 px-1 dark:bg-stone-900">npx prisma generate</code>
        </li>
        <li>Restart <code className="rounded bg-white/80 px-1 dark:bg-stone-900">npm run dev</code> and refresh.</li>
      </ol>
      <p className="mt-4 text-sm text-stone-600 dark:text-stone-400">
        If <code className="rounded bg-stone-200 px-1 dark:bg-stone-800">npm</code> is not recognized, install
        Node.js from nodejs.org and reopen the terminal, or double-click{" "}
        <code className="rounded bg-stone-200 px-1 dark:bg-stone-800">read-later/run-dev.bat</code>.
      </p>
      <Link
        href="/"
        className="mt-6 inline-block text-sm font-medium text-amber-800 underline dark:text-amber-300"
      >
        Back to home
      </Link>
    </div>
  );
}

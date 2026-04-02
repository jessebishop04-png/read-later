import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app-chrome px-6 text-center">
      <p className="max-w-md text-lg font-semibold text-stone-900 dark:text-stone-50">
        You are offline
      </p>
      <p className="mt-3 max-w-md text-stone-600 dark:text-stone-400">
        Pages you opened while online may still be available from cache. Check your connection and
        try again.
      </p>
      <Link
        href="/library"
        className="mt-8 rounded-xl bg-amber-700 px-5 py-2.5 text-sm font-medium text-white hover:bg-amber-800 dark:bg-amber-600"
      >
        Go to library
      </Link>
    </div>
  );
}

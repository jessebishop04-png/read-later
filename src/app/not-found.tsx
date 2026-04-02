import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-app-chrome px-6">
      <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">Page not found</p>
      <Link href="/library" className="mt-6 text-amber-800 underline dark:text-amber-400">
        Back to library
      </Link>
    </div>
  );
}

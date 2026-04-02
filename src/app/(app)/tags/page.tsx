import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { DbSetupNotice } from "@/components/db-setup-notice";

type TagRow = Prisma.TagGetPayload<{
  include: { _count: { select: { items: true } } };
}>;

export default async function TagsPage() {
  const session = await safeAuth();
  if (!session?.user?.id) return null;

  let tags: TagRow[];
  try {
    tags = await prisma.tag.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      include: { _count: { select: { items: true } } },
    });
  } catch {
    return <DbSetupNotice />;
  }

  return (
    <div>
      <p className="text-stone-600 dark:text-stone-400">
        Jump to saved items by tag. Tag filters apply to your main library (non-archived by default).
      </p>

      {tags.length === 0 ? (
        <p className="mt-10 text-center text-stone-500 dark:text-stone-400">
          No tags yet. Add comma-separated tags when saving a link or on any article page.
        </p>
      ) : (
        <ul className="mt-8 flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.id}>
              <Link
                href={`/library?tag=${encodeURIComponent(t.name)}`}
                className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm font-medium text-stone-800 shadow-sm transition hover:border-amber-300 hover:bg-amber-50 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 dark:hover:border-amber-800 dark:hover:bg-amber-950/40"
              >
                {t.name}
                <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  {t._count.items}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

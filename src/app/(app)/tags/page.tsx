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
      <h1 className="text-3xl font-bold text-white">Tags</h1>
      <p className="mt-2 text-[color:var(--keepr-muted)]">
        Jump to saved items by tag. Tag filters apply to your main library (non-archived by default).
      </p>

      {tags.length === 0 ? (
        <p className="mt-10 text-center text-[color:var(--keepr-muted)]">
          No tags yet. Add comma-separated tags when saving a link or on any article page.
        </p>
      ) : (
        <ul className="mt-8 flex flex-wrap gap-2">
          {tags.map((t) => (
            <li key={t.id}>
              <Link
                href={`/library?tag=${encodeURIComponent(t.name)}`}
                className="inline-flex items-center gap-2 rounded-full bg-[color:var(--keepr-elevated)] px-4 py-2 text-sm font-medium text-white transition hover:bg-[color:var(--keepr-elevated-hover)]"
              >
                {t.name}
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-[color:var(--keepr-muted)]">
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

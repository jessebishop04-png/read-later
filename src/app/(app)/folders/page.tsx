import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { DbSetupNotice } from "@/components/db-setup-notice";
import { FoldersBrowser } from "@/components/folders-browser";

export default async function FoldersPage() {
  const session = await safeAuth();
  if (!session?.user?.id) return null;

  try {
    const folders = await prisma.folder.findMany({
      where: { userId: session.user.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { items: true } },
        items: {
          where: { imageUrl: { not: null } },
          orderBy: { createdAt: "desc" },
          take: 4,
          select: { imageUrl: true },
        },
      },
    });

    return (
      <FoldersBrowser
        folders={folders.map((f) => ({
          id: f.id,
          name: f.name,
          itemCount: f._count.items,
          thumbs: f.items.map((i) => i.imageUrl),
        }))}
      />
    );
  } catch {
    return <DbSetupNotice />;
  }
}

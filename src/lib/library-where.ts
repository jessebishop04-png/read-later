import type { Prisma } from "@prisma/client";

export type LibraryView = "home" | "liked" | "archive" | "videos" | "notes";

export function parseLibraryView(raw: string | undefined): LibraryView | null {
  if (!raw) return null;
  if (["home", "liked", "archive", "videos", "notes"].includes(raw)) {
    return raw as LibraryView;
  }
  return null;
}

export function buildLibraryWhere(
  userId: string,
  params: {
    view?: string | null;
    tag?: string | null;
    folderId?: string | null;
    q?: string | null;
  }
): Prisma.SavedItemWhereInput {
  const view = parseLibraryView(params.view ?? undefined) ?? "home";
  const where: Prisma.SavedItemWhereInput = { userId };

  if (params.folderId) {
    where.folderId = params.folderId;
  }

  if (view === "archive") {
    where.archived = true;
  } else {
    where.archived = false;
  }

  if (view === "liked") {
    where.liked = true;
  }

  if (view === "videos") {
    where.kind = "video";
  }

  const andClauses: Prisma.SavedItemWhereInput[] = [];

  if (view === "notes") {
    andClauses.push({ notes: { not: null } }, { notes: { not: "" } });
  }

  const q = params.q?.trim();
  if (q) {
    andClauses.push({
      OR: [
        { title: { contains: q } },
        { excerpt: { contains: q } },
        { sourceUrl: { contains: q } },
        { siteName: { contains: q } },
        { notes: { contains: q } },
        {
          tags: {
            some: {
              tag: { userId, name: { contains: q } },
            },
          },
        },
      ],
    });
  }

  if (andClauses.length > 0) {
    where.AND = andClauses;
  }

  if (params.tag?.trim()) {
    where.tags = {
      some: {
        tag: { name: params.tag.trim(), userId },
      },
    };
  }

  return where;
}

export function libraryTitle(view: LibraryView | null, folderName?: string | null): string {
  if (folderName) return folderName;
  switch (view) {
    case "liked":
      return "Liked";
    case "archive":
      return "Archive";
    case "videos":
      return "Videos";
    case "notes":
      return "Notes";
    default:
      return "Home";
  }
}

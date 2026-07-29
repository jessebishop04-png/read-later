import type { Prisma } from "@prisma/client";

export type LibraryView =
  | "home"
  | "liked"
  | "archive"
  | "trash"
  | "notes"
  | "articles"
  | "books"
  | "emails"
  | "pdfs"
  | "videos"
  | "podcasts";

const LIBRARY_VIEWS: LibraryView[] = [
  "home",
  "liked",
  "archive",
  "trash",
  "notes",
  "articles",
  "books",
  "emails",
  "pdfs",
  "videos",
  "podcasts",
];

/** Sidebar content-type views → SavedItem.kind */
const VIEW_KIND: Partial<Record<LibraryView, string>> = {
  articles: "article",
  books: "book",
  emails: "email",
  pdfs: "pdf",
  videos: "video",
  podcasts: "podcast",
};

export function parseLibraryView(raw: string | undefined): LibraryView | null {
  if (!raw) return null;
  if ((LIBRARY_VIEWS as string[]).includes(raw)) {
    return raw as LibraryView;
  }
  return null;
}

export function isKindLibraryView(view: LibraryView | null): boolean {
  return Boolean(view && VIEW_KIND[view]);
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

  if (view === "archive" || view === "trash") {
    where.archived = true;
  } else {
    where.archived = false;
  }

  if (view === "liked") {
    where.liked = true;
  }

  const kind = VIEW_KIND[view];
  if (kind) {
    where.kind = kind;
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
    case "trash":
      return "Trash";
    case "articles":
      return "Articles";
    case "books":
      return "Books";
    case "emails":
      return "Emails";
    case "pdfs":
      return "PDFs";
    case "videos":
      return "Videos";
    case "podcasts":
      return "Podcasts";
    case "notes":
      return "Notes";
    default:
      return "Home";
  }
}

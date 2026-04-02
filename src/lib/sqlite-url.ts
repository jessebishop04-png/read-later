import { createHash } from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

/** Keep algorithm in sync with `scripts/sqlite-resolve.cjs`. */
export function isOneDrivePath(p: string): boolean {
  return p.replace(/\//g, "\\").toLowerCase().includes("onedrive");
}

export function findProjectRoot(): string | null {
  const starts = new Set<string>([process.cwd()]);
  try {
    starts.add(path.dirname(fileURLToPath(import.meta.url)));
  } catch {
    /* ignore */
  }
  for (const start of starts) {
    let dir = path.resolve(start);
    for (let i = 0; i < 40; i++) {
      if (fs.existsSync(path.join(dir, "prisma", "schema.prisma"))) return dir;
      const parent = path.dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

/** Prisma + SQLite on Windows: avoid `file:///…` with `%20` (often SQLite error 14). */
export function prismaSqliteFileUrl(absDbPath: string): string {
  const abs = path.resolve(absDbPath);
  const norm = abs.replace(/\\/g, "/");
  if (process.platform === "win32" && /^[A-Za-z]:\//.test(norm)) {
    return `file:${norm}`;
  }
  return pathToFileURL(abs).href;
}

/**
 * OneDrive: SQLite on synced folders often returns error 14. Use LocalAppData instead.
 * First run copies existing `prisma/dev.db` into that store.
 */
export function resolveSqliteDatabaseFileAndUrl(projectRoot: string): { filePath: string; url: string } {
  const prismaDir = path.join(projectRoot, "prisma");
  const repoDb = path.join(prismaDir, "dev.db");

  if (!isOneDrivePath(projectRoot)) {
    try {
      fs.mkdirSync(prismaDir, { recursive: true });
    } catch {
      /* ignore */
    }
    return { filePath: repoDb, url: prismaSqliteFileUrl(repoDb) };
  }

  const la = process.env.LOCALAPPDATA;
  if (!la) {
    try {
      fs.mkdirSync(prismaDir, { recursive: true });
    } catch {
      /* ignore */
    }
    return { filePath: repoDb, url: prismaSqliteFileUrl(repoDb) };
  }

  let realRoot = projectRoot;
  try {
    realRoot = fs.realpathSync.native(projectRoot);
  } catch {
    /* ignore */
  }
  const hash = createHash("sha256").update(realRoot).digest("hex").slice(0, 20);
  const appDataDir = path.join(la, "read-later-sqlite", hash);
  fs.mkdirSync(appDataDir, { recursive: true });
  const appDataDb = path.join(appDataDir, "dev.db");

  if (!fs.existsSync(appDataDb) && fs.existsSync(repoDb)) {
    try {
      fs.copyFileSync(repoDb, appDataDb);
    } catch {
      /* ignore */
    }
  }

  return { filePath: appDataDb, url: prismaSqliteFileUrl(appDataDb) };
}

/**
 * True when DATABASE_URL is an absolute SQLite file URL (e.g. Docker `file:/data/prod.db`).
 * Those must be used as-is so Prisma matches `prisma migrate deploy`, not remapped to prisma/dev.db.
 */
function isAbsoluteFileSqliteUrl(url: string): boolean {
  const match = /^file:(.+)$/i.exec(url.trim());
  if (!match) return false;
  const rest = match[1];
  if (rest.startsWith("//")) {
    const after = rest.slice(2);
    if (after.startsWith("/")) return true;
    if (/^[A-Za-z]:[\\/]/.test(after)) return true;
    return false;
  }
  if (rest.startsWith("/")) return true;
  if (/^[A-Za-z]:[\\/]/.test(rest)) return true;
  return false;
}

/** Resolved URL for PrismaClient when using local SQLite (not Postgres). */
export function getPrismaSqliteDatasourceUrl(): string | undefined {
  const raw = process.env.DATABASE_URL?.replace(/^["']|["']$/g, "").trim() ?? "";
  if (raw && !raw.toLowerCase().startsWith("file:")) {
    return undefined;
  }

  if (raw && isAbsoluteFileSqliteUrl(raw)) {
    process.env.DATABASE_URL = raw;
    return raw;
  }

  const root = findProjectRoot();
  if (!root) return undefined;
  if (!fs.existsSync(path.join(root, "prisma", "schema.prisma"))) return undefined;

  const { url } = resolveSqliteDatabaseFileAndUrl(root);
  process.env.DATABASE_URL = url;
  return url;
}

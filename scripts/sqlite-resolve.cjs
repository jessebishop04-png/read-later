/**
 * Resolve SQLite path for Prisma CLI. OneDrive → LocalAppData (SQLite error 14 fix).
 * Keep in sync with src/lib/sqlite-url.ts
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function isOneDrivePath(p) {
  return p.replace(/\//g, "\\").toLowerCase().includes("onedrive");
}

function findProjectRoot(startDir) {
  let dir = path.resolve(startDir);
  for (let i = 0; i < 40; i++) {
    if (fs.existsSync(path.join(dir, "prisma", "schema.prisma"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

function prismaSqliteFileUrl(absDbPath) {
  const abs = path.resolve(absDbPath);
  const norm = abs.replace(/\\/g, "/");
  if (process.platform === "win32" && /^[A-Za-z]:\//.test(norm)) {
    return `file:${norm}`;
  }
  const { pathToFileURL } = require("url");
  return pathToFileURL(abs).href;
}

function resolveSqliteDatabaseFileAndUrl(projectRoot) {
  const prismaDir = path.join(projectRoot, "prisma");
  const repoDb = path.join(prismaDir, "dev.db");

  if (!isOneDrivePath(projectRoot)) {
    try {
      fs.mkdirSync(prismaDir, { recursive: true });
    } catch {}
    return { filePath: repoDb, url: prismaSqliteFileUrl(repoDb) };
  }

  const la = process.env.LOCALAPPDATA;
  if (!la) {
    try {
      fs.mkdirSync(prismaDir, { recursive: true });
    } catch {}
    return { filePath: repoDb, url: prismaSqliteFileUrl(repoDb) };
  }

  let realRoot = projectRoot;
  try {
    realRoot = fs.realpathSync.native(projectRoot);
  } catch {}

  const hash = crypto.createHash("sha256").update(realRoot).digest("hex").slice(0, 20);
  const appDataDir = path.join(la, "read-later-sqlite", hash);
  fs.mkdirSync(appDataDir, { recursive: true });
  const appDataDb = path.join(appDataDir, "dev.db");

  if (!fs.existsSync(appDataDb) && fs.existsSync(repoDb)) {
    try {
      fs.copyFileSync(repoDb, appDataDb);
    } catch {}
  }

  return { filePath: appDataDb, url: prismaSqliteFileUrl(appDataDb) };
}

function applyToEnv(root) {
  const projectRoot = findProjectRoot(root) || root;
  const { url, filePath } = resolveSqliteDatabaseFileAndUrl(projectRoot);
  process.env.DATABASE_URL = url;
  return { root: projectRoot, url, filePath };
}

module.exports = {
  applyToEnv,
  findProjectRoot,
  resolveSqliteDatabaseFileAndUrl,
  prismaSqliteFileUrl,
  isOneDrivePath,
};

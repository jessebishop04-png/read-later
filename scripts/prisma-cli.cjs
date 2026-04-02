/** Run Prisma CLI with DATABASE_URL resolved for OneDrive / Windows SQLite. */
const { spawnSync } = require("child_process");
const path = require("path");
const { applyToEnv } = require("./sqlite-resolve.cjs");

const root = path.join(__dirname, "..");
applyToEnv(root);

const prismaEntry = path.join(root, "node_modules", "prisma", "build", "index.js");
const args = [prismaEntry, ...process.argv.slice(2)];

const r = spawnSync(process.execPath, args, {
  stdio: "inherit",
  cwd: root,
  env: process.env,
});
process.exit(r.status ?? 1);

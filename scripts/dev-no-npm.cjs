/**
 * Dev without npm on PATH: resolve SQLite URL, prisma generate/push, .next junction, Next + NODE_PATH.
 */
const { spawnSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const { applyToEnv } = require("./sqlite-resolve.cjs");
const { setupOnedriveNext, isOneDrive } = require("./onedrive-next-setup.cjs");

const root = path.join(__dirname, "..");
process.chdir(root);

applyToEnv(root);

const node = process.execPath;
const prismaEntry = path.join(root, "node_modules", "prisma", "build", "index.js");
const nm = path.join(root, "node_modules");
const nodePathEnv = {
  ...process.env,
  NODE_PATH: [nm, process.env.NODE_PATH].filter(Boolean).join(path.delimiter),
};

function findNodeInstallDir() {
  const pf = process.env["ProgramFiles"] || "C:\\Program Files";
  const pfx86 = process.env["ProgramFiles(x86)"] || "C:\\Program Files (x86)";
  const la = process.env.LocalAppData || "";
  const candidates = [
    path.join(pf, "nodejs"),
    path.join(pfx86, "nodejs"),
    la ? path.join(la, "Programs", "nodejs") : "",
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "node_modules", "npm", "bin", "npm-cli.js"))) return c;
  }
  for (const c of candidates) {
    if (fs.existsSync(path.join(c, "node.exe"))) return c;
  }
  return path.join(pf, "nodejs");
}

const npmCliJs = path.join(findNodeInstallDir(), "node_modules", "npm", "bin", "npm-cli.js");

if (!fs.existsSync(path.join(root, "node_modules", "next"))) {
  if (!fs.existsSync(npmCliJs)) {
    console.error("Missing node_modules. Install Node.js, then run npm install in read-later.");
    process.exit(1);
  }
  spawnSync(node, [npmCliJs, "install", "--no-fund", "--no-audit"], {
    stdio: "inherit",
    cwd: root,
    env: { ...process.env, PATH: `${findNodeInstallDir()};${process.env.PATH || ""}` },
  });
}

const envExample = path.join(root, ".env.example");
const envFile = path.join(root, ".env");
if (fs.existsSync(envExample) && !fs.existsSync(envFile)) {
  fs.copyFileSync(envExample, envFile);
}

const ensureAuth = path.join(root, "scripts", "ensure-auth-secret.cjs");
if (fs.existsSync(ensureAuth)) {
  const r = spawnSync(node, [ensureAuth], { stdio: "inherit", cwd: root, env: process.env });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

applyToEnv(root);

if (!fs.existsSync(prismaEntry)) {
  console.error("Prisma not found. Run npm install.");
  process.exit(1);
}

let gen = spawnSync(node, [prismaEntry, "generate", "--no-hints"], {
  stdio: "inherit",
  cwd: root,
  env: nodePathEnv,
});
if (gen.status !== 0) process.exit(gen.status ?? 1);

spawnSync(node, [prismaEntry, "db", "push", "--skip-generate"], {
  stdio: "inherit",
  cwd: root,
  env: nodePathEnv,
});

const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
if (!fs.existsSync(nextBin)) {
  console.error("Next.js not found.");
  process.exit(1);
}

if (isOneDrive(root)) {
  const jr = setupOnedriveNext(root);
  if (!jr.ok) process.exit(1);
}

const devPort = process.env.READ_LATER_PORT || "3000";
console.log("\nhttp://localhost:" + devPort + "\n");

let nodeExeDir;
try {
  nodeExeDir = path.dirname(fs.realpathSync.native(node));
} catch {
  nodeExeDir = path.dirname(node);
}
const pathPrefix = `${nodeExeDir}${path.delimiter}${findNodeInstallDir()}${path.delimiter}`;

spawn(node, [nextBin, "dev", "-p", String(devPort)], {
  stdio: "inherit",
  cwd: root,
  env: {
    ...process.env,
    PATH: `${pathPrefix}${process.env.PATH || ""}`,
    NODE_PATH: nodePathEnv.NODE_PATH,
    DATABASE_URL: process.env.DATABASE_URL,
  },
}).on("exit", (code) => process.exit(code ?? 0));

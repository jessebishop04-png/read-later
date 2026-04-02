/**
 * When .next is a junction outside the repo, server chunks need NODE_PATH for react/jsx-runtime.
 */
const { spawn } = require("child_process");
const path = require("path");

const root = path.join(__dirname, "..");
const nm = path.join(root, "node_modules");
const nextBin = path.join(nm, "next", "dist", "bin", "next");
const subArgs = process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["dev"];
const sep = path.delimiter;
const nodePath = [nm, process.env.NODE_PATH].filter(Boolean).join(sep);

spawn(process.execPath, [nextBin, ...subArgs], {
  stdio: "inherit",
  cwd: root,
  env: { ...process.env, NODE_PATH: nodePath },
}).on("exit", (code) => process.exit(code ?? 0));

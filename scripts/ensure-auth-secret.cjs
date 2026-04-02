/* Ensures .env has a usable AUTH_SECRET (NextAuth requires it). */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const envPath = path.join(__dirname, "..", ".env");
const examplePath = path.join(__dirname, "..", ".env.example");

let raw = "";
if (fs.existsSync(envPath)) {
  raw = fs.readFileSync(envPath, "utf8");
} else if (fs.existsSync(examplePath)) {
  raw = fs.readFileSync(examplePath, "utf8");
  fs.writeFileSync(envPath, raw, "utf8");
  console.log("Created .env from .env.example");
  raw = fs.readFileSync(envPath, "utf8");
} else {
  raw = 'DATABASE_URL="file:./dev.db"\nAUTH_SECRET=""\nNEXTAUTH_URL="http://localhost:3000"\n';
  fs.writeFileSync(envPath, raw, "utf8");
  console.log("Created minimal .env");
}

function getAuthSecretValue(text) {
  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*AUTH_SECRET\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[1].trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    return v.trim();
  }
  return "";
}

const existing = getAuthSecretValue(raw);
if (existing.length >= 16) {
  process.exit(0);
}

const secret = crypto.randomBytes(32).toString("hex");
const lines = raw.split(/\r?\n/);
let replaced = false;
const out = lines.map((line) => {
  if (/^\s*AUTH_SECRET\s*=/.test(line)) {
    replaced = true;
    return `AUTH_SECRET="${secret}"`;
  }
  return line;
});
if (!replaced) {
  out.push(`AUTH_SECRET="${secret}"`);
}
fs.writeFileSync(envPath, out.join("\n").replace(/\n+$/, "\n"), "utf8");
console.log("Set AUTH_SECRET in .env (was missing or too short).");

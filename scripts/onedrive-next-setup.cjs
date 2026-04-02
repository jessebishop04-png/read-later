/**
 * OneDrive breaks Next `.next` (EINVAL readlink). Junction `.next` -> LocalAppData.
 */
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");

function isOneDrive(root) {
  return root.replace(/\//g, "\\").toLowerCase().includes("onedrive");
}

function removeNextPath(nextPath, root) {
  if (!fs.existsSync(nextPath)) return;
  try {
    fs.rmSync(nextPath, { maxRetries: 12, retryDelay: 400, recursive: true, force: true });
  } catch {}
  if (fs.existsSync(nextPath)) {
    spawnSync("cmd", ["/c", `rmdir /s /q "${nextPath}"`], { cwd: root, stdio: "ignore", windowsHide: true });
  }
}

function sameJunctionTarget(nextPath, target) {
  if (!fs.existsSync(nextPath)) return false;
  try {
    return fs.realpathSync.native(nextPath) === fs.realpathSync.native(target);
  } catch {
    return false;
  }
}

function makeJunction(nextPath, target) {
  try {
    fs.symlinkSync(target, nextPath, "junction");
    return true;
  } catch (e) {
    console.warn("Node junction failed:", (e && e.message) || e);
  }
  const r = spawnSync("cmd", ["/c", `mklink /J "${nextPath}" "${target}"`], {
    stdio: "inherit",
    windowsHide: true,
  });
  if (r.status === 0) return true;
  const esc = (s) => s.replace(/'/g, "''");
  const r2 = spawnSync(
    "powershell.exe",
    [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `New-Item -ItemType Junction -Path '${esc(nextPath)}' -Target '${esc(target)}' | Out-Null`,
    ],
    { stdio: "inherit", windowsHide: true }
  );
  return r2.status === 0;
}

function setupOnedriveNext(root = path.join(__dirname, "..")) {
  if (!isOneDrive(root)) return { ok: true, mode: "not-onedrive" };
  const la = process.env.LOCALAPPDATA;
  if (!la) return { ok: true, mode: "skip-no-localappdata" };

  const nextPath = path.join(root, ".next");
  const targets = [
    path.join(la, "read-later-next-junction"),
    path.join(os.tmpdir(), "read-later-next-junction"),
  ];

  for (const target of targets) {
    fs.mkdirSync(target, { recursive: true });
    if (sameJunctionTarget(nextPath, target)) {
      return { ok: true, mode: "junction-already", target };
    }
  }

  console.log("OneDrive: linking .next off synced folder…");
  removeNextPath(nextPath, root);

  for (const target of targets) {
    fs.mkdirSync(target, { recursive: true });
    if (makeJunction(nextPath, target)) {
      console.log("Linked .next ->", target, "\n");
      return { ok: true, mode: "junction-created", target };
    }
    removeNextPath(nextPath, root);
  }

  console.error("Could not create .next junction. Enable Developer Mode or move the project off OneDrive.\n");
  return { ok: false, mode: "junction-failed" };
}

if (require.main === module) {
  const r = setupOnedriveNext();
  process.exit(r.ok ? 0 : 1);
}

module.exports = { setupOnedriveNext, isOneDrive };

import { mkdir, readdir, unlink, writeFile } from "fs/promises";
import { join } from "path";

export const AVATARS_URL_PREFIX = "/avatars";

function dir() {
  return join(process.cwd(), "public", "avatars");
}

/** Remove any uploaded avatar files for this user (filenames are `{userId}.{ext}`). */
export async function removeStoredAvatarsForUser(userId: string): Promise<void> {
  const root = dir();
  try {
    const files = await readdir(root);
    const needle = `${userId}.`;
    for (const name of files) {
      if (name.startsWith(needle)) {
        await unlink(join(root, name)).catch(() => {});
      }
    }
  } catch {
    // missing dir is fine
  }
}

export async function saveUserAvatarFile(
  userId: string,
  buffer: Buffer,
  extWithDot: string
): Promise<string> {
  const root = dir();
  await mkdir(root, { recursive: true });
  await removeStoredAvatarsForUser(userId);
  const filename = `${userId}${extWithDot}`;
  await writeFile(join(root, filename), buffer);
  return `${AVATARS_URL_PREFIX}/${filename}`;
}

export function isOurAvatarPath(image: string | null | undefined): boolean {
  if (!image || !image.startsWith(AVATARS_URL_PREFIX + "/")) return false;
  return true;
}

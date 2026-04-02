import { createHash, randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

export function hashToken(plain: string): string {
  return createHash("sha256").update(plain, "utf8").digest("hex");
}

export function generateApiToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function resolveUserIdFromBearer(
  authHeader: string | null
): Promise<string | null> {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const plain = authHeader.slice(7).trim();
  if (!plain) return null;
  const tokenHash = hashToken(plain);
  const row = await prisma.apiToken.findUnique({
    where: { tokenHash },
    select: { userId: true },
  });
  if (!row) return null;
  await prisma.apiToken.update({
    where: { tokenHash },
    data: { lastUsedAt: new Date() },
  });
  return row.userId;
}

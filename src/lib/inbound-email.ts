import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

const LOCAL_MIN = 4;
const LOCAL_MAX = 32;
const LOCAL_RE = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?$/i;

export function inboundEmailDomain(): string {
  return (process.env.INBOUND_EMAIL_DOMAIN || "").trim().toLowerCase();
}

export function inboundConfigured(): boolean {
  return Boolean(inboundEmailDomain());
}

export function formatInboundAddress(local: string): string {
  const domain = inboundEmailDomain();
  if (!domain) return `${local}@library.keepr.local`;
  return `${local}@${domain}`;
}

export function generateInboundLocal(): string {
  return randomBytes(5).toString("hex"); // 10 hex chars
}

export function normalizeInboundLocal(raw: string): string | null {
  const local = raw.trim().toLowerCase();
  if (local.length < LOCAL_MIN || local.length > LOCAL_MAX) return null;
  if (!LOCAL_RE.test(local)) return null;
  if (local.includes("..")) return null;
  return local;
}

/** Extract local-part from a To address like `"Name" <slug@domain>` or `slug@domain`. */
export function extractLocalPart(address: string): string | null {
  const trimmed = address.trim();
  const angle = trimmed.match(/<([^>]+)>/);
  const email = (angle ? angle[1] : trimmed).trim().toLowerCase();
  const at = email.lastIndexOf("@");
  if (at <= 0) return null;
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const expected = inboundEmailDomain();
  if (expected && domain !== expected) return null;
  return normalizeInboundLocal(local);
}

export async function ensureInboundEmailLocal(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { inboundEmailLocal: true },
  });
  if (user?.inboundEmailLocal) return user.inboundEmailLocal;

  for (let attempt = 0; attempt < 8; attempt++) {
    const local = generateInboundLocal();
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { inboundEmailLocal: local },
        select: { inboundEmailLocal: true },
      });
      if (updated.inboundEmailLocal) return updated.inboundEmailLocal;
    } catch {
      /* unique collision — retry */
    }
  }
  throw new Error("Could not allocate inbound email address");
}

export async function findUserIdByInboundTo(toAddresses: string[]): Promise<string | null> {
  for (const addr of toAddresses) {
    const local = extractLocalPart(addr);
    if (!local) continue;
    const user = await prisma.user.findUnique({
      where: { inboundEmailLocal: local },
      select: { id: true },
    });
    if (user) return user.id;
  }
  return null;
}

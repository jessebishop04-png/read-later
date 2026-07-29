import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { safeAuth } from "@/lib/safe-auth";
import {
  ensureInboundEmailLocal,
  formatInboundAddress,
  inboundConfigured,
  inboundEmailDomain,
  normalizeInboundLocal,
} from "@/lib/inbound-email";

export const runtime = "nodejs";

export async function GET() {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const local = await ensureInboundEmailLocal(session.user.id);
    const address = formatInboundAddress(local);
    return NextResponse.json({
      local,
      address,
      domain: inboundEmailDomain() || "library.keepr.local",
      configured: inboundConfigured(),
    });
  } catch (err) {
    console.error("keepr: inbound email GET failed", err);
    return NextResponse.json({ error: "Could not load inbound address" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { local?: string };
  const local = typeof body.local === "string" ? normalizeInboundLocal(body.local) : null;
  if (!local) {
    return NextResponse.json(
      {
        error:
          "Use 4–32 characters: letters, numbers, dots, hyphens, or underscores (no leading/trailing punctuation).",
      },
      { status: 400 }
    );
  }

  const taken = await prisma.user.findFirst({
    where: {
      inboundEmailLocal: local,
      NOT: { id: session.user.id },
    },
    select: { id: true },
  });
  if (taken) {
    return NextResponse.json({ error: "That address is already taken" }, { status: 409 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { inboundEmailLocal: local },
    });
    return NextResponse.json({
      local,
      address: formatInboundAddress(local),
      domain: inboundEmailDomain() || "library.keepr.local",
      configured: inboundConfigured(),
    });
  } catch (err) {
    console.error("keepr: inbound email PATCH failed", err);
    return NextResponse.json({ error: "Could not update address" }, { status: 500 });
  }
}

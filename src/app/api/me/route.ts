import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { isLikelyHttpUrl, normalizeUrlInput } from "@/lib/normalize-url";
import { isOurAvatarPath, removeStoredAvatarsForUser } from "@/lib/avatar-storage";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const data: { name?: string | null; image?: string | null } = {};

  if ("name" in o) {
    if (o.name === null) {
      data.name = null;
    } else if (typeof o.name === "string") {
      const t = o.name.trim();
      data.name = t === "" ? null : t;
    } else {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 });
    }
  }

  if ("image" in o) {
    if (o.image === null) {
      const existing = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { image: true },
      });
      if (existing?.image && isOurAvatarPath(existing.image)) {
        await removeStoredAvatarsForUser(session.user.id);
      }
      data.image = null;
    } else if (typeof o.image === "string") {
      const raw = o.image.trim();
      if (raw === "") {
        return NextResponse.json({ error: "Image URL cannot be empty" }, { status: 400 });
      }
      const normalized = normalizeUrlInput(raw);
      if (!normalized || !isLikelyHttpUrl(normalized)) {
        return NextResponse.json({ error: "Enter a valid http(s) image URL" }, { status: 400 });
      }
      const existing = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { image: true },
      });
      if (existing?.image && isOurAvatarPath(existing.image)) {
        await removeStoredAvatarsForUser(session.user.id);
      }
      data.image = normalized;
    } else {
      return NextResponse.json({ error: "Invalid image" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

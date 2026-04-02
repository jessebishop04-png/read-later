import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { saveUserAvatarFile } from "@/lib/avatar-storage";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const MAX_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
};

export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be 2 MB or smaller" }, { status: 400 });
  }

  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Use JPEG, PNG, GIF, or WebP" },
      { status: 400 }
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length === 0) {
    return NextResponse.json({ error: "Empty file" }, { status: 400 });
  }

  try {
    const publicPath = await saveUserAvatarFile(session.user.id, buf, ext);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { image: publicPath },
    });
    return NextResponse.json({ ok: true, image: publicPath });
  } catch {
    return NextResponse.json({ error: "Could not save avatar" }, { status: 500 });
  }
}

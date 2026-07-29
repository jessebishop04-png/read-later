import { randomBytes } from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { prisma } from "@/lib/prisma";
import { extractPdfFromBuffer } from "@/lib/pdf-extract";
import { textToContentHtml } from "@/lib/search-text";
import { scheduleReindex } from "@/lib/search-index";
import { normalizeUrlInput } from "@/lib/normalize-url";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

function uploadsRoot(): string {
  return path.join(process.cwd(), "public", "uploads");
}

async function saveUploadFile(userId: string, buf: Buffer, originalName: string): Promise<string> {
  const dir = path.join(uploadsRoot(), userId);
  await fs.mkdir(dir, { recursive: true });
  const safeBase = originalName.replace(/[^\w.\-]+/g, "_").slice(0, 80) || "document.pdf";
  const name = `${Date.now()}-${randomBytes(4).toString("hex")}-${safeBase.endsWith(".pdf") ? safeBase : `${safeBase}.pdf`}`;
  const abs = path.join(dir, name);
  await fs.writeFile(abs, buf);
  return `/uploads/${userId}/${name}`;
}

export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const ct = req.headers.get("content-type") || "";

  try {
    let buf: Buffer | null = null;
    let titleHint = "PDF document";
    let sourceUrl = "";
    let tagNames: string[] = [];

    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      const tagsRaw = form.get("tags");
      if (typeof tagsRaw === "string" && tagsRaw.trim()) {
        tagNames = tagsRaw
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
      if (file instanceof File) {
        if (file.size > MAX_BYTES) {
          return NextResponse.json({ error: "PDF must be under 15 MB" }, { status: 400 });
        }
        const ab = await file.arrayBuffer();
        buf = Buffer.from(ab);
        titleHint = file.name.replace(/\.pdf$/i, "") || titleHint;
        if (buf.slice(0, 4).toString() !== "%PDF") {
          return NextResponse.json({ error: "File does not look like a PDF" }, { status: 400 });
        }
        sourceUrl = await saveUploadFile(userId, buf, file.name || "document.pdf");
      } else {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }
    } else {
      const body = await req.json().catch(() => ({}));
      const raw = typeof body.url === "string" ? body.url.trim() : "";
      if (!raw) {
        return NextResponse.json({ error: "Missing url or file" }, { status: 400 });
      }
      if (Array.isArray(body.tags)) {
        tagNames = body.tags
          .filter((t: unknown) => typeof t === "string")
          .map((t: string) => t.trim())
          .filter(Boolean);
      }
      const url = normalizeUrlInput(raw);
      const res = await fetch(url, {
        headers: { Accept: "application/pdf,*/*" },
        redirect: "follow",
      });
      if (!res.ok) {
        return NextResponse.json({ error: `Could not fetch PDF (${res.status})` }, { status: 422 });
      }
      const ab = await res.arrayBuffer();
      if (ab.byteLength > MAX_BYTES) {
        return NextResponse.json({ error: "PDF must be under 15 MB" }, { status: 400 });
      }
      buf = Buffer.from(ab);
      if (buf.slice(0, 4).toString() !== "%PDF") {
        return NextResponse.json({ error: "URL did not return a PDF" }, { status: 422 });
      }
      sourceUrl = url;
      titleHint =
        decodeURIComponent(url.split("/").pop()?.split("?")[0] || "document.pdf").replace(
          /\.pdf$/i,
          ""
        ) || titleHint;
    }

    if (!buf) {
      return NextResponse.json({ error: "No PDF data" }, { status: 400 });
    }

    const extracted = await extractPdfFromBuffer(buf, titleHint);
    const title = extracted.title || titleHint;

    const created = await prisma.savedItem.create({
      data: {
        userId,
        sourceUrl,
        title,
        excerpt: extracted.text.slice(0, 280),
        siteName: "PDF",
        contentHtml: textToContentHtml(extracted.text, title),
        contentText: extracted.text,
        kind: "pdf",
      },
    });

    for (const name of tagNames) {
      const tag = await prisma.tag.upsert({
        where: { userId_name: { userId, name } },
        create: { userId, name },
        update: {},
      });
      await prisma.itemTag.create({ data: { itemId: created.id, tagId: tag.id } });
    }

    scheduleReindex(created.id);

    return NextResponse.json({ id: created.id, kind: "pdf" });
  } catch (e) {
    const message = e instanceof Error ? e.message : "PDF save failed";
    return NextResponse.json({ error: message }, { status: 422 });
  }
}

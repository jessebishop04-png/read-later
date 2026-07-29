import { NextResponse } from "next/server";
import { safeAuth } from "@/lib/safe-auth";
import { extractEmailFromHtmlBody, extractEmailFromRaw } from "@/lib/email-extract";
import { createEmailSavedItem } from "@/lib/create-email-item";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024;

/**
 * Dev / manual import: paste raw .eml, or JSON { subject, from, html|text }.
 * Authenticated users only — used when Resend inbound MX is not configured.
 */
export async function POST(req: Request) {
  const session = await safeAuth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ct = req.headers.get("content-type") || "";

  try {
    if (ct.includes("multipart/form-data")) {
      const form = await req.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return NextResponse.json({ error: "Missing file" }, { status: 400 });
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "File must be under 5 MB" }, { status: 400 });
      }
      const buf = Buffer.from(await file.arrayBuffer());
      const extracted = await extractEmailFromRaw(buf);
      const result = await createEmailSavedItem(session.user.id, extracted);
      return NextResponse.json({ id: result.id, kind: "email", duplicated: result.duplicated });
    }

    if (ct.includes("message/rfc822") || ct.includes("text/plain")) {
      const raw = await req.text();
      if (Buffer.byteLength(raw) > MAX_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 400 });
      }
      const extracted = await extractEmailFromRaw(raw);
      const result = await createEmailSavedItem(session.user.id, extracted);
      return NextResponse.json({ id: result.id, kind: "email", duplicated: result.duplicated });
    }

    const body = (await req.json().catch(() => ({}))) as {
      raw?: string;
      subject?: string;
      from?: string;
      html?: string;
      text?: string;
      messageId?: string;
    };

    if (typeof body.raw === "string" && body.raw.trim()) {
      if (Buffer.byteLength(body.raw) > MAX_BYTES) {
        return NextResponse.json({ error: "Payload too large" }, { status: 400 });
      }
      const extracted = await extractEmailFromRaw(body.raw);
      const result = await createEmailSavedItem(session.user.id, extracted);
      return NextResponse.json({ id: result.id, kind: "email", duplicated: result.duplicated });
    }

    if (!body.html?.trim() && !body.text?.trim()) {
      return NextResponse.json(
        { error: "Provide raw MIME, .eml file, or html/text body" },
        { status: 400 }
      );
    }

    const extracted = await extractEmailFromHtmlBody({
      subject: body.subject,
      from: body.from,
      html: body.html,
      text: body.text,
      messageId: body.messageId,
    });
    const result = await createEmailSavedItem(session.user.id, extracted);
    return NextResponse.json({ id: result.id, kind: "email", duplicated: result.duplicated });
  } catch (err) {
    console.error("keepr: manual email import failed", err);
    return NextResponse.json({ error: "Could not import email" }, { status: 500 });
  }
}

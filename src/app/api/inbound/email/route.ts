import { NextResponse } from "next/server";
import { Resend } from "resend";
import { Webhook } from "svix";
import { extractEmailFromRaw } from "@/lib/email-extract";
import { findUserIdByInboundTo } from "@/lib/inbound-email";
import { createEmailSavedItem } from "@/lib/create-email-item";

export const runtime = "nodejs";

type ResendReceivedEvent = {
  type?: string;
  data?: {
    email_id?: string;
    from?: string;
    to?: string[];
    subject?: string;
    message_id?: string;
  };
};

function verifyWebhook(payload: string, headers: Headers): ResendReceivedEvent {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) {
    // Dev / unconfigured: accept JSON without signature (never enable in production without secret).
    if (process.env.NODE_ENV === "production") {
      throw new Error("RESEND_WEBHOOK_SECRET is required in production");
    }
    return JSON.parse(payload) as ResendReceivedEvent;
  }

  const wh = new Webhook(secret);
  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");
  if (!svixId || !svixTimestamp || !svixSignature) {
    throw new Error("Missing svix headers");
  }
  return wh.verify(payload, {
    "svix-id": svixId,
    "svix-timestamp": svixTimestamp,
    "svix-signature": svixSignature,
  }) as ResendReceivedEvent;
}

async function fetchRawEmail(emailId: string): Promise<string | null> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;

  const resend = new Resend(apiKey);
  const { data, error } = await resend.emails.receiving.get(emailId);
  if (error || !data) {
    console.error("keepr: resend receiving.get failed", error);
    return null;
  }

  const downloadUrl =
    (data as { raw?: { download_url?: string } }).raw?.download_url ||
    (data as { download_url?: string }).download_url;

  if (downloadUrl) {
    const rawRes = await fetch(downloadUrl);
    if (!rawRes.ok) {
      console.error("keepr: failed to download raw email", rawRes.status);
      return null;
    }
    return await rawRes.text();
  }

  // Fallback: some SDK shapes expose html/text directly
  const html = (data as { html?: string }).html;
  const text = (data as { text?: string }).text;
  const subject = (data as { subject?: string }).subject || "";
  const from = (data as { from?: string }).from || "";
  if (html || text) {
    const headers = [
      `From: ${from}`,
      `Subject: ${subject}`,
      "MIME-Version: 1.0",
      "Content-Type: text/html; charset=utf-8",
      "",
      html || `<pre>${(text || "").replace(/</g, "&lt;")}</pre>`,
    ];
    return headers.join("\r\n");
  }

  return null;
}

export async function POST(req: Request) {
  const payload = await req.text();

  let event: ResendReceivedEvent;
  try {
    event = verifyWebhook(payload, req.headers);
  } catch (err) {
    console.error("keepr: inbound webhook verify failed", err);
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }

  if (event.type && event.type !== "email.received") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const to = Array.isArray(event.data?.to) ? event.data.to : [];
  const emailId = event.data?.email_id;
  if (!emailId) {
    return NextResponse.json({ error: "Missing email_id" }, { status: 400 });
  }

  const userId = await findUserIdByInboundTo(to);
  if (!userId) {
    console.warn("keepr: inbound email for unknown recipient", to);
    return NextResponse.json({ ok: true, skipped: "unknown_recipient" });
  }

  const raw = await fetchRawEmail(emailId);
  if (!raw) {
    return NextResponse.json({ error: "Could not fetch email body" }, { status: 502 });
  }

  try {
    const extracted = await extractEmailFromRaw(raw);
    if (!extracted.messageId && event.data?.message_id) {
      extracted.messageId = event.data.message_id;
    }
    const result = await createEmailSavedItem(userId, extracted);
    return NextResponse.json({
      ok: true,
      id: result.id,
      duplicated: result.duplicated,
    });
  } catch (err) {
    console.error("keepr: inbound email ingest failed", err);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}

import { simpleParser, type ParsedMail } from "mailparser";
import { JSDOM } from "jsdom";
import { stripHtml, textToContentHtml } from "@/lib/search-text";

export type ExtractedEmail = {
  subject: string;
  from: string;
  fromAddress: string;
  messageId: string | null;
  contentHtml: string;
  contentText: string;
  excerpt: string;
};

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatFrom(parsed: ParsedMail): { display: string; address: string } {
  const first = parsed.from?.value?.[0];
  const address = (first?.address || "").trim();
  const name = (first?.name || "").trim();
  if (name && address) return { display: `${name} <${address}>`, address };
  if (address) return { display: address, address };
  if (name) return { display: name, address: "" };
  const raw = typeof parsed.from?.text === "string" ? parsed.from.text.trim() : "";
  return { display: raw || "Unknown sender", address: "" };
}

/** Light sanitize: drop scripts/styles/tracking pixels; keep readable markup. */
export function sanitizeEmailHtml(html: string): string {
  const dom = new JSDOM(`<body>${html}</body>`);
  const doc = dom.window.document;
  const body = doc.body;

  body.querySelectorAll("script, style, iframe, object, embed, form, link, meta").forEach((el) => {
    el.remove();
  });

  body.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      if (name.startsWith("on")) el.removeAttribute(attr.name);
      if ((name === "href" || name === "src") && /^javascript:/i.test(value)) {
        el.removeAttribute(attr.name);
      }
    }
  });

  // Strip common 1x1 tracking pixels
  body.querySelectorAll("img").forEach((img) => {
    const w = img.getAttribute("width");
    const h = img.getAttribute("height");
    const src = (img.getAttribute("src") || "").toLowerCase();
    if (
      (w === "1" && h === "1") ||
      /pixel|track|open\.gif|beacon/i.test(src)
    ) {
      img.remove();
    }
  });

  return body.innerHTML.trim();
}

function buildContentHtml(subject: string, fromDisplay: string, html: string | null, text: string | null): {
  contentHtml: string;
  contentText: string;
} {
  const header = `<header class="email-meta"><p class="email-from"><strong>From:</strong> ${escapeHtml(fromDisplay)}</p>${
    subject ? `<p class="email-subject"><strong>Subject:</strong> ${escapeHtml(subject)}</p>` : ""
  }</header>`;

  if (html?.trim()) {
    const cleaned = sanitizeEmailHtml(html);
    const contentText = stripHtml(cleaned) || text?.trim() || "";
    return {
      contentHtml: `<article class="email-doc">${header}<div class="email-body">${cleaned}</div></article>`,
      contentText,
    };
  }

  const plain = (text || "").trim() || "(No content)";
  const bodyHtml = textToContentHtml(plain, subject || "Email");
  // textToContentHtml already wraps in article+h1; prepend meta
  return {
    contentHtml: `<article class="email-doc">${header}<div class="email-body">${bodyHtml.replace(
      /^<article>|<\/article>$/g,
      ""
    )}</div></article>`,
    contentText: plain,
  };
}

export async function extractEmailFromRaw(raw: string | Buffer): Promise<ExtractedEmail> {
  const parsed = await simpleParser(raw, { skipImageLinks: true });
  const { display, address } = formatFrom(parsed);
  const subject = (parsed.subject || "").trim() || "(no subject)";
  const messageId = parsed.messageId?.trim() || null;
  const html = typeof parsed.html === "string" ? parsed.html : null;
  const text = typeof parsed.text === "string" ? parsed.text : null;
  const { contentHtml, contentText } = buildContentHtml(subject, display, html, text);
  const excerpt = contentText.slice(0, 280);

  return {
    subject,
    from: display,
    fromAddress: address,
    messageId,
    contentHtml,
    contentText,
    excerpt,
  };
}

export async function extractEmailFromHtmlBody(opts: {
  subject?: string;
  from?: string;
  html?: string;
  text?: string;
  messageId?: string;
}): Promise<ExtractedEmail> {
  const subject = (opts.subject || "").trim() || "(no subject)";
  const from = (opts.from || "").trim() || "Unknown sender";
  const { contentHtml, contentText } = buildContentHtml(
    subject,
    from,
    opts.html?.trim() || null,
    opts.text?.trim() || null
  );
  return {
    subject,
    from,
    fromAddress: from.includes("@") ? from.replace(/^.*<|>.*$/g, "") : "",
    messageId: opts.messageId?.trim() || null,
    contentHtml,
    contentText,
    excerpt: contentText.slice(0, 280),
  };
}

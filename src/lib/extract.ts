import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { normalizeUrlInput, isLikelyHttpUrl } from "@/lib/normalize-url";

function fetchTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

export type ExtractKind = "article" | "video";

export type ExtractResult = {
  kind: ExtractKind;
  title: string;
  author: string | null;
  excerpt: string | null;
  siteName: string | null;
  contentHtml: string;
  contentText: string | null;
  imageUrl: string | null;
  embedUrl?: string | null;
};

function parseYoutubeId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname === "youtu.be") {
      const id = u.pathname.slice(1).split("/")[0];
      return id || null;
    }
    if (
      u.hostname === "www.youtube.com" ||
      u.hostname === "youtube.com" ||
      u.hostname === "m.youtube.com"
    ) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/embed\/([^/?]+)/);
      if (m) return m[1];
      const s = u.pathname.match(/^\/shorts\/([^/?]+)/);
      if (s) return s[1];
    }
  } catch {
    return null;
  }
  return null;
}

function parseVimeoId(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("vimeo.com")) {
      const m = u.pathname.match(/^\/(\d+)/);
      return m ? m[1] : null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Absolute http(s) URL, or null if unusable. */
function resolveToHttpUrl(base: string, raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = raw.trim();
  if (!t || t.toLowerCase().startsWith("data:")) return null;
  try {
    const u = new URL(t, base);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.href;
  } catch {
    return null;
  }
}

function decodeBasicHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function pickMetaImageByKeys(doc: Document, keys: Set<string>, pageUrl: string): string | null {
  for (const meta of doc.querySelectorAll("meta[content]")) {
    const prop = meta.getAttribute("property")?.toLowerCase().trim();
    const name = meta.getAttribute("name")?.toLowerCase().trim();
    const k = prop || name || "";
    if (!keys.has(k)) continue;
    const raw = decodeBasicHtmlEntities(meta.getAttribute("content")?.trim() || "");
    const resolved = resolveToHttpUrl(pageUrl, raw);
    if (resolved) return resolved;
  }
  return null;
}

/**
 * Read &lt;head&gt; meta tags from the document **before** calling Readability.parse(),
 * which mutates/removes much of the original DOM.
 */
function metaImageFromDocument(doc: Document, pageUrl: string): string | null {
  return (
    pickMetaImageByKeys(doc, new Set(["og:image:secure_url", "og:image:url"]), pageUrl) ??
    pickMetaImageByKeys(doc, new Set(["og:image"]), pageUrl) ??
    pickMetaImageByKeys(doc, new Set(["twitter:image:src", "twitter:image"]), pageUrl)
  );
}

function imageSrcCandidates(img: Element): string[] {
  const seen = new Set<string>();
  const add = (s: string | null | undefined) => {
    const t = s?.trim();
    if (t) seen.add(decodeBasicHtmlEntities(t));
  };
  add(img.getAttribute("src"));
  add(img.getAttribute("data-src"));
  add(img.getAttribute("data-lazy-src"));
  add(img.getAttribute("data-original"));
  const srcset = img.getAttribute("srcset");
  if (srcset) {
    for (const part of srcset.split(",")) {
      const url = part.trim().split(/\s+/)[0];
      add(url);
    }
  }
  return [...seen];
}

function pickFirstUsableImage(imgs: Iterable<Element>, pageUrl: string, limit = 40): string | null {
  let n = 0;
  for (const el of imgs) {
    if (++n > limit) break;
    if (el.tagName !== "IMG") continue;
    const w = parseInt(el.getAttribute("width") || "", 10);
    const h = parseInt(el.getAttribute("height") || "", 10);
    if ((Number.isFinite(w) && w > 0 && w <= 2) || (Number.isFinite(h) && h > 0 && h <= 2)) {
      continue;
    }
    for (const raw of imageSrcCandidates(el)) {
      const resolved = resolveToHttpUrl(pageUrl, raw);
      if (resolved) return resolved;
    }
  }
  return null;
}

function firstImageFromContentHtml(contentHtml: string, pageUrl: string): string | null {
  const inner = new JSDOM(`<body>${contentHtml}</body>`, { url: pageUrl });
  return pickFirstUsableImage(inner.window.document.querySelectorAll("body img"), pageUrl);
}

/** Fallback: scan unmutated HTML for a likely hero image (Readability often strips &lt;img&gt; from content). */
function firstImageFromRawHtml(html: string, pageUrl: string): string | null {
  const dom = new JSDOM(html, { url: pageUrl });
  const doc = dom.window.document;
  const selectors = [
    "article img",
    "main img",
    '[role="main"] img',
    '[itemprop="articleBody"] img',
    ".post-content img",
    ".post img",
    ".entry-content img",
    ".entry img",
    ".article-body img",
    ".article img",
  ];
  for (const sel of selectors) {
    const found = pickFirstUsableImage(doc.querySelectorAll(sel), pageUrl, 25);
    if (found) return found;
  }
  return pickFirstUsableImage(doc.querySelectorAll("body img"), pageUrl, 40);
}

function leadImage(
  metaImage: string | null,
  articleContentHtml: string | null,
  rawHtml: string,
  pageUrl: string
): string | null {
  if (metaImage) return metaImage;
  if (articleContentHtml) {
    const fromContent = firstImageFromContentHtml(articleContentHtml, pageUrl);
    if (fromContent) return fromContent;
  }
  return firstImageFromRawHtml(rawHtml, pageUrl);
}

type VideoOembedFields = {
  title: string;
  author: string | null;
  imageUrl: string | null;
};

async function youtubeOembedMeta(pageUrl: string, videoId: string): Promise<VideoOembedFields> {
  const fallbackImage = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
  try {
    const oembed = `https://www.youtube.com/oembed?url=${encodeURIComponent(pageUrl)}&format=json`;
    const res = await fetch(oembed, {
      headers: { Accept: "application/json" },
      signal: fetchTimeoutSignal(10_000),
    });
    if (!res.ok) {
      return {
        title: "YouTube video",
        author: null,
        imageUrl: fallbackImage,
      };
    }
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    const title =
      typeof data.title === "string" && data.title.trim() ? data.title.trim() : "YouTube video";
    const authorRaw = typeof data.author_name === "string" ? data.author_name.trim() : "";
    const author = authorRaw || null;
    const thumb = typeof data.thumbnail_url === "string" ? data.thumbnail_url.trim() : "";
    const imageUrl = thumb && isLikelyHttpUrl(thumb) ? thumb : fallbackImage;
    return { title, author, imageUrl };
  } catch {
    return {
      title: "YouTube video",
      author: null,
      imageUrl: fallbackImage,
    };
  }
}

async function vimeoOembedMeta(pageUrl: string): Promise<VideoOembedFields> {
  try {
    const oembed = `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(pageUrl)}`;
    const res = await fetch(oembed, {
      headers: { Accept: "application/json" },
      signal: fetchTimeoutSignal(10_000),
    });
    if (!res.ok) {
      return { title: "Vimeo video", author: null, imageUrl: null };
    }
    const data = (await res.json()) as {
      title?: string;
      author_name?: string;
      thumbnail_url?: string;
    };
    const title =
      typeof data.title === "string" && data.title.trim() ? data.title.trim() : "Vimeo video";
    const authorRaw = typeof data.author_name === "string" ? data.author_name.trim() : "";
    const author = authorRaw || null;
    const thumb = typeof data.thumbnail_url === "string" ? data.thumbnail_url.trim() : "";
    const imageUrl = thumb && isLikelyHttpUrl(thumb) ? thumb : null;
    return { title, author, imageUrl };
  } catch {
    return { title: "Vimeo video", author: null, imageUrl: null };
  }
}

export async function extractFromUrl(url: string): Promise<ExtractResult> {
  const normalized = normalizeUrlInput(url);
  if (!normalized || !isLikelyHttpUrl(normalized)) {
    throw new Error("Enter a valid web address (e.g. https://example.com/article).");
  }

  const yt = parseYoutubeId(normalized);
  if (yt) {
    const meta = await youtubeOembedMeta(normalized, yt);
    return {
      kind: "video",
      title: meta.title,
      author: meta.author,
      excerpt: null,
      siteName: "YouTube",
      contentHtml: `<p><a href="${normalized}" target="_blank" rel="noopener noreferrer">Open on YouTube</a></p>`,
      contentText: null,
      imageUrl: meta.imageUrl,
      embedUrl: `https://www.youtube.com/embed/${yt}`,
    };
  }

  const vm = parseVimeoId(normalized);
  if (vm) {
    const meta = await vimeoOembedMeta(normalized);
    return {
      kind: "video",
      title: meta.title,
      author: meta.author,
      excerpt: null,
      siteName: "Vimeo",
      contentHtml: `<p><a href="${normalized}" target="_blank" rel="noopener noreferrer">Open on Vimeo</a></p>`,
      contentText: null,
      imageUrl: meta.imageUrl,
      embedUrl: `https://player.vimeo.com/video/${vm}`,
    };
  }

  let res: Response;
  try {
    res = await fetch(normalized, {
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: fetchTimeoutSignal(25_000),
    });
  } catch (e) {
    if (e instanceof Error && e.name === "AbortError") {
      throw new Error("Request timed out — the site may be slow or blocking automated fetches.");
    }
    throw new Error(
      e instanceof Error ? e.message : "Could not reach that URL. Check the link and try again."
    );
  }

  if (!res.ok) {
    throw new Error(
      `Could not load that page (HTTP ${res.status}). The site may block saving or require a login.`
    );
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url: normalized });
  const doc = dom.window.document;
  // Capture Open Graph / Twitter images before Readability.parse() mutates the DOM.
  const metaImage = metaImageFromDocument(doc, normalized);

  const reader = new Readability(doc);
  const article = reader.parse();

  if (!article) {
    const title =
      doc.querySelector("title")?.textContent?.trim() ||
      normalized;
    const imageUrl = leadImage(metaImage, null, html, normalized);
    return {
      kind: "article",
      title,
      author: null,
      excerpt: null,
      siteName: null,
      contentHtml: `<p>Could not extract a readable article. <a href="${normalized}" target="_blank" rel="noopener noreferrer">Open original</a></p>`,
      contentText: null,
      imageUrl,
    };
  }

  const contentHtml = article.content || "<p></p>";
  const dom2 = new JSDOM(`<body>${contentHtml}</body>`);
  const contentText = dom2.window.document.body.textContent?.trim() || null;
  const imageUrl = leadImage(metaImage, contentHtml, html, normalized);

  return {
    kind: "article",
    title: article.title || "Untitled",
    author: article.byline || null,
    excerpt: article.excerpt || null,
    siteName: article.siteName || null,
    contentHtml,
    contentText,
    imageUrl,
  };
}

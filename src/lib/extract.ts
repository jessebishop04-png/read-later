import { Readability } from "@mozilla/readability";
import { JSDOM, VirtualConsole } from "jsdom";
import { normalizeUrlInput, isLikelyHttpUrl } from "@/lib/normalize-url";

function fetchTimeoutSignal(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function createDom(html: string, pageUrl: string): JSDOM {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", () => {
    /* ignore CSS parse noise */
  });
  return new JSDOM(html, { url: pageUrl, contentType: "text/html", virtualConsole });
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

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

function metaAttr(doc: Document, selectors: string[]): string | null {
  for (const sel of selectors) {
    const el = doc.querySelector(sel);
    if (!el) continue;
    const v =
      el.getAttribute("content")?.trim() ||
      (sel === "title" ? el.textContent?.trim() : null) ||
      null;
    if (v) return decodeBasicHtmlEntities(v);
  }
  return null;
}

function siteNameFromUrl(pageUrl: string): string | null {
  try {
    return new URL(pageUrl).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
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
  const inner = createDom(`<body>${contentHtml}</body>`, pageUrl);
  return pickFirstUsableImage(inner.window.document.querySelectorAll("body img"), pageUrl);
}

/** Fallback: scan unmutated HTML for a likely hero image (Readability often strips &lt;img&gt; from content). */
function firstImageFromRawHtml(html: string, pageUrl: string): string | null {
  const dom = createDom(html, pageUrl);
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

/** Publisher bot-wall / ToS copy that Readability sometimes treats as the "article". */
function isPublisherStubText(text: string): boolean {
  const t = text.toLowerCase().replace(/\s+/g, " ");
  return (
    t.includes("data mine or scrape") ||
    t.includes("using automated means is prohibited") ||
    t.includes("new york times content is made available for your personal") ||
    t.includes("please enable js and disable any ad blocker") ||
    t.includes("enable javascript and cookies to continue") ||
    t.includes("subscribe to continue reading")
  );
}

function isChallengeHtml(status: number, html: string): boolean {
  if (status === 401 || status === 403 || status === 429 || status === 503) return true;
  if (status < 200 || status >= 400) return true;
  const sample = html.slice(0, 4000).toLowerCase();
  return (
    sample.includes("please enable js and disable any ad blocker") ||
    sample.includes("cf-browser-verification") ||
    sample.includes("just a moment...") ||
    sample.includes("checking your browser before accessing")
  );
}

const CHROME_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Upgrade-Insecure-Requests": "1",
};

/** Used only when Chrome is blocked — many news sites still serve OG HTML to these. */
const PREVIEW_BOT_HEADERS: Record<string, string>[] = [
  {
    "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
    Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
  {
    "User-Agent": "Twitterbot/1.0",
    Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  },
  {
    "User-Agent": "LinkedInBot/1.0 (compatible; Mozilla/5.0)",
    Accept: "text/html,*/*;q=0.8",
  },
];

async function fetchHtml(
  url: string,
  headers: Record<string, string>
): Promise<{ ok: true; html: string; finalUrl: string } | { ok: false; status: number }> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers,
      signal: fetchTimeoutSignal(25_000),
    });
    const html = await res.text();
    if (!res.ok || isChallengeHtml(res.status, html)) {
      return { ok: false, status: res.status };
    }
    return { ok: true, html, finalUrl: res.url || url };
  } catch {
    return { ok: false, status: 0 };
  }
}

/**
 * Extract readable article HTML. Prefers Defuddle (keeps more content than Readability),
 * falls back to Mozilla Readability, then a cleaned article/main container.
 */
async function extractArticleFromHtml(html: string, pageUrl: string): Promise<ExtractResult> {
  const dom = createDom(html, pageUrl);
  const doc = dom.window.document;
  const metaImage = metaImageFromDocument(doc, pageUrl);
  const ogTitle = metaAttr(doc, [
    "meta[property='og:title']",
    "meta[name='twitter:title']",
    "title",
  ]);
  const ogDescription = metaAttr(doc, [
    "meta[property='og:description']",
    "meta[name='description']",
    "meta[name='twitter:description']",
  ]);
  const ogSite = metaAttr(doc, ["meta[property='og:site_name']"]);

  type Candidate = {
    html: string;
    text: string;
    title: string | null;
    author: string | null;
    excerpt: string | null;
    siteName: string | null;
  };

  type Scored = Candidate & { source: "defuddle" | "readability" | "container" };

  const scored: Scored[] = [];

  // 1) Defuddle — more complete than Readability on many modern layouts.
  try {
    const { Defuddle } = await import("defuddle/node");
    // Pass JSDOM document (not HTML string) — Defuddle's Linkedom path breaks on some CSS selectors.
    const parsed = await Defuddle(doc.cloneNode(true) as Document, pageUrl, {
      url: pageUrl,
      removeExactSelectors: true,
      removePartialSelectors: true,
      // Keep more body text (closer to Instapaper) when scoring is aggressive.
      removeLowScoring: false,
    });
    const contentHtml = typeof parsed.content === "string" ? parsed.content : "";
    const text =
      createDom(`<body>${contentHtml}</body>`, pageUrl)
        .window.document.body.textContent?.replace(/\s+/g, " ")
        .trim() || "";
    if (contentHtml && text.length >= 80 && !isPublisherStubText(text) && !looksLikeNavChrome(text)) {
      scored.push({
        source: "defuddle",
        html: contentHtml,
        text,
        title: parsed.title || null,
        author: parsed.author || null,
        excerpt: parsed.description || null,
        siteName: parsed.site || null,
      });
    }
  } catch (e) {
    console.warn("keepr: defuddle failed", e);
  }

  // 2) Mozilla Readability fallback.
  try {
    const reader = new Readability(doc.cloneNode(true) as Document, {
      charThreshold: 20,
      nbTopCandidates: 10,
    });
    const article = reader.parse();
    const contentHtml = article?.content || "";
    const text =
      article?.textContent?.replace(/\s+/g, " ").trim() ||
      (contentHtml
        ? createDom(`<body>${contentHtml}</body>`, pageUrl)
            .window.document.body.textContent?.replace(/\s+/g, " ")
            .trim() || ""
        : "");
    if (
      article &&
      contentHtml &&
      text.length >= 80 &&
      !isPublisherStubText(text) &&
      !looksLikeNavChrome(text)
    ) {
      scored.push({
        source: "readability",
        html: contentHtml,
        text,
        title: article.title || null,
        author: article.byline || null,
        excerpt: article.excerpt || null,
        siteName: article.siteName || null,
      });
    }
  } catch (e) {
    console.warn("keepr: readability failed", e);
  }

  // 3) Largest article-ish container (when parsers under-extract).
  const container = pickLargestArticleContainer(doc, pageUrl);
  if (container && !isPublisherStubText(container.text)) {
    scored.push({
      source: "container",
      html: container.html,
      text: container.text,
      title: null,
      author: null,
      excerpt: null,
      siteName: null,
    });
  }

  const best = pickBestExtraction(scored);

  if (!best) {
    const title = ogTitle || pageUrl;
    const excerpt = ogDescription;
    const imageUrl = leadImage(metaImage, null, html, pageUrl);
    const open = `<p><a href="${escapeHtml(pageUrl)}" target="_blank" rel="noopener noreferrer">Open original article</a></p>`;
    return {
      kind: "article",
      title,
      author: null,
      excerpt,
      siteName: ogSite || siteNameFromUrl(pageUrl),
      contentHtml: excerpt ? `<p>${escapeHtml(excerpt)}</p>${open}` : open,
      contentText: excerpt,
      imageUrl,
    };
  }

  const imageUrl = leadImage(metaImage, best.html, html, pageUrl);
  return {
    kind: "article",
    title: best.title || ogTitle || "Untitled",
    author: best.author,
    excerpt: best.excerpt || ogDescription || best.text.slice(0, 280),
    siteName: best.siteName || ogSite || siteNameFromUrl(pageUrl),
    contentHtml: best.html,
    contentText: best.text,
    imageUrl,
  };
}

function pickLargestArticleContainer(
  doc: Document,
  pageUrl: string
): { html: string; text: string } | null {
  const selectors = [
    "article",
    '[role="main"]',
    "main",
    ".post-content",
    ".entry-content",
    ".article-body",
    ".article-content",
    ".story-body",
    "#article-body",
    ".rich-text",
  ];
  let best: { html: string; text: string; score: number } | null = null;
  for (const sel of selectors) {
    for (const el of Array.from(doc.querySelectorAll(sel))) {
      const clone = el.cloneNode(true) as Element;
      clone
        .querySelectorAll("script, style, noscript, iframe, nav, aside, form, header, footer")
        .forEach((n) => n.remove());
      absolutizeElementUrls(clone, pageUrl);
      const text = (clone.textContent || "").replace(/\s+/g, " ").trim();
      if (text.length < 500) continue;
      const linkChars = Array.from(clone.querySelectorAll("a")).reduce(
        (n, a) => n + ((a.textContent || "").length || 0),
        0
      );
      const density = linkChars / Math.max(text.length, 1);
      // Nav chrome is link-heavy; real articles are mostly paragraphs.
      if (density > 0.42) continue;
      const paragraphs = clone.querySelectorAll("p").length;
      const score = text.length + paragraphs * 400 - density * 5000;
      if (!best || score > best.score) {
        best = { html: `<div class="keepr-article">${clone.innerHTML}</div>`, text, score };
      }
    }
  }
  return best ? { html: best.html, text: best.text } : null;
}

function absolutizeElementUrls(root: Element, pageUrl: string) {
  for (const el of Array.from(root.querySelectorAll("[href]"))) {
    const abs = resolveToHttpUrl(pageUrl, el.getAttribute("href"));
    if (abs) el.setAttribute("href", abs);
  }
  for (const el of Array.from(root.querySelectorAll("[src]"))) {
    const abs = resolveToHttpUrl(pageUrl, el.getAttribute("src"));
    if (abs) el.setAttribute("src", abs);
  }
}

function pickBestExtraction<
  T extends {
    source: "defuddle" | "readability" | "container";
    text: string;
  },
>(candidates: T[]): T | undefined {
  if (!candidates.length) return undefined;
  const parsers = candidates
    .filter((c) => c.source === "defuddle" || c.source === "readability")
    .filter((c) => !looksLikeNavChrome(c.text))
    .sort((a, b) => b.text.length - a.text.length);
  const container = candidates
    .filter((c) => c.source === "container")
    .filter((c) => !looksLikeNavChrome(c.text))
    .sort((a, b) => b.text.length - a.text.length)[0];
  const bestParser = parsers[0];

  // Prefer a solid parser result — containers often include nav/chrome and look "longer".
  if (bestParser && bestParser.text.length >= 700) {
    if (
      container &&
      container.text.length >= bestParser.text.length * 1.9 &&
      container.text.length - bestParser.text.length > 5000
    ) {
      return container;
    }
    return bestParser;
  }
  if (bestParser && bestParser.text.length >= 250) {
    if (container && container.text.length > bestParser.text.length * 2.5) return container;
    return bestParser;
  }
  return bestParser || container;
}

/** Heuristic: extraction that starts with site chrome instead of article prose. */
function looksLikeNavChrome(text: string): boolean {
  const head = text.slice(0, 280).toLowerCase().replace(/\s+/g, " ").trim();
  if (!head) return true;
  const chromeHints = [
    "skip to main content",
    "skip to content",
    "jump to content",
    "jump to navigation",
    "main menu move to sidebar",
    "sign insubscribe",
    "open navigation menu",
  ];
  return chromeHints.some((h) => head.includes(h));
}

/** True when fetch HTML looks like a JS shell / truncated article. */
function looksLikeThinCapture(html: string, contentText: string | null | undefined): boolean {
  const textLen = (contentText || "").replace(/\s+/g, " ").trim().length;
  if (textLen >= 1400) return false;
  if (isPublisherStubText(contentText || "")) return true;
  const sample = html.slice(0, 12_000).toLowerCase();
  const spaHints =
    sample.includes('id="__next"') ||
    sample.includes("__next_data__") ||
    sample.includes('id="root"') ||
    sample.includes('id="app"') ||
    sample.includes("nuxt") ||
    sample.includes("data-reactroot");
  if (spaHints && textLen < 900) return true;
  if (html.length > 8_000 && textLen < 450) return true;
  return textLen < 350;
}

function looksLikeFailedPage(title: string, contentText: string | null | undefined): boolean {
  const t = (title || "").toLowerCase().trim();
  if (
    t.includes("page not found") ||
    t.includes("404 not found") ||
    t === "404" ||
    t.includes("access denied") ||
    t.includes("just a moment")
  ) {
    return true;
  }
  return looksLikeThinCapture("", contentText) && (contentText || "").length < 500;
}

/** Parse HTML already obtained (e.g. from the browser extension). */
export async function extractFromPageHtml(html: string, pageUrl: string): Promise<ExtractResult> {
  return extractArticleFromHtml(html, pageUrl);
}

export async function extractFromUrl(
  url: string,
  options?: { html?: string | null }
): Promise<ExtractResult> {
  const normalized = normalizeUrlInput(url);
  if (!normalized || !isLikelyHttpUrl(normalized)) {
    throw new Error("Enter a valid web address (e.g. https://example.com/article).");
  }

  // Extension / client already has the live page — best path for paywalled sites.
  const providedHtml = typeof options?.html === "string" ? options.html.trim() : "";
  if (providedHtml.length > 500) {
    return await extractArticleFromHtml(providedHtml, normalized);
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

  // 1) Primary path — Chrome fetch + Defuddle/Readability.
  const primary = await fetchHtml(normalized, CHROME_HEADERS);
  if (primary.ok) {
    let extracted = await extractArticleFromHtml(primary.html, primary.finalUrl || normalized);

    // SPA / thin shells / soft 404s: render with installed Chrome/Edge when available.
    if (
      looksLikeThinCapture(primary.html, extracted.contentText) ||
      looksLikeFailedPage(extracted.title, extracted.contentText)
    ) {
      try {
        const { fetchHtmlWithBrowser } = await import("@/lib/browser-fetch");
        const rendered = await fetchHtmlWithBrowser(normalized);
        if (rendered && rendered.length > 800) {
          const fromBrowser = await extractArticleFromHtml(rendered, primary.finalUrl || normalized);
          if (
            (fromBrowser.contentText?.length || 0) >
              (extracted.contentText?.length || 0) * 1.15 ||
            (looksLikeFailedPage(extracted.title, extracted.contentText) &&
              !looksLikeFailedPage(fromBrowser.title, fromBrowser.contentText))
          ) {
            extracted = fromBrowser;
          }
        }
      } catch (e) {
        console.warn("keepr: browser render skipped", e);
      }
    }

    if (extracted.contentText && !isPublisherStubText(extracted.contentText)) {
      return extracted;
    }
    // Chrome got a paywall/stub page — try preview bots for better OG HTML, else keep this.
    for (const headers of PREVIEW_BOT_HEADERS) {
      const alt = await fetchHtml(normalized, headers);
      if (!alt.ok) continue;
      const fromBot = await extractArticleFromHtml(alt.html, alt.finalUrl || normalized);
      if (fromBot.contentText && !isPublisherStubText(fromBot.contentText)) {
        return fromBot;
      }
      // Prefer bot result if it at least has a better title/excerpt.
      if (
        fromBot.title &&
        fromBot.title !== normalized &&
        (fromBot.excerpt || fromBot.imageUrl) &&
        (!extracted.excerpt || fromBot.title.length > extracted.title.length)
      ) {
        return fromBot;
      }
    }
    return extracted;
  }

  // 2) Chrome blocked — try link-preview bots (NYT/etc. often allow these).
  for (const headers of PREVIEW_BOT_HEADERS) {
    const alt = await fetchHtml(normalized, headers);
    if (!alt.ok) continue;
    return await extractArticleFromHtml(alt.html, alt.finalUrl || normalized);
  }

  // 3) Last resort — headless browser (may still hit paywalls).
  try {
    const { fetchHtmlWithBrowser } = await import("@/lib/browser-fetch");
    const rendered = await fetchHtmlWithBrowser(normalized);
    if (rendered && rendered.length > 800) {
      return await extractArticleFromHtml(rendered, normalized);
    }
  } catch (e) {
    console.warn("keepr: browser render failed", e);
  }

  throw new Error(
    `Could not load that page (HTTP ${primary.status || "error"}). The site may block saving or require a login.`
  );
}

/**
 * Accepts pasted URLs with or without a scheme so the HTML5 url input is not required.
 */
export function normalizeUrlInput(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Avoid turning "mailto:..." or "//cdn..." into invalid URLs
  if (trimmed.includes("://") || trimmed.startsWith("//")) {
    return trimmed.startsWith("//") ? `https:${trimmed}` : trimmed;
  }

  return `https://${trimmed}`;
}

export function isLikelyHttpUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

import type { ScanSentence } from "@/lib/scan-types";

export type ScanHighlightBand = "human" | "possible" | "likely";

export type ScanTextRange = {
  start: number;
  end: number;
  index: number;
  band: ScanHighlightBand;
  generatedProb: number;
};

/** Map GPTZero sentence score → highlight band. */
export function sentenceBand(s: Pick<ScanSentence, "generatedProb" | "highlight">): ScanHighlightBand {
  if (s.highlight || s.generatedProb >= 0.65) return "likely";
  if (s.generatedProb >= 0.5) return "possible";
  return "human";
}

export function bandClass(band: ScanHighlightBand): string {
  if (band === "likely") return "scan-mark-likely";
  if (band === "possible") return "scan-mark-possible";
  return "scan-mark-human";
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Find each sentence in `text` sequentially (whitespace-normalized).
 * Returns ranges in original string coordinates for wrapping.
 */
export function matchSentencesInText(
  text: string,
  sentences: ScanSentence[]
): ScanTextRange[] {
  if (!text || !sentences.length) return [];

  const ranges: ScanTextRange[] = [];
  let searchFrom = 0;

  for (let index = 0; index < sentences.length; index++) {
    const sentence = sentences[index]!;
    const needle = normalizeWs(sentence.text);
    if (!needle) continue;

    const found = findNormalizedSubstring(text, needle, searchFrom);
    if (!found) {
      // Retry from start for out-of-order API sentences
      const retry = findNormalizedSubstring(text, needle, 0);
      if (!retry) continue;
      ranges.push({
        start: retry.start,
        end: retry.end,
        index,
        band: sentenceBand(sentence),
        generatedProb: sentence.generatedProb,
      });
      searchFrom = retry.end;
      continue;
    }

    ranges.push({
      start: found.start,
      end: found.end,
      index,
      band: sentenceBand(sentence),
      generatedProb: sentence.generatedProb,
    });
    searchFrom = found.end;
  }

  return ranges.sort((a, b) => a.start - b.start);
}

/**
 * Locate `needle` (already whitespace-normalized) inside `haystack` starting at `from`,
 * allowing flexible whitespace in the haystack.
 */
function findNormalizedSubstring(
  haystack: string,
  needle: string,
  from: number
): { start: number; end: number } | null {
  if (!needle) return null;

  // Fast path: exact substring
  const exact = haystack.indexOf(needle, from);
  if (exact !== -1) {
    return { start: exact, end: exact + needle.length };
  }

  // Build a regex that tolerates whitespace differences
  const escaped = needle
    .split(" ")
    .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter(Boolean);
  if (!escaped.length) return null;

  const pattern = escaped.join("\\s+");
  try {
    const re = new RegExp(pattern, "g");
    re.lastIndex = from;
    const m = re.exec(haystack);
    if (!m || m.index < from) return null;
    return { start: m.index, end: m.index + m[0].length };
  } catch {
    return null;
  }
}

/** Wrap plain text with mark spans for scan bands (escaped HTML). */
export function renderHighlightedPlainText(
  text: string,
  ranges: ScanTextRange[],
  selectedIndex: number | null
): string {
  if (!ranges.length) {
    return escapeHtml(text);
  }

  const parts: string[] = [];
  let cursor = 0;
  for (const r of ranges) {
    if (r.start < cursor) continue;
    if (r.start > cursor) {
      parts.push(escapeHtml(text.slice(cursor, r.start)));
    }
    const selected = selectedIndex === r.index ? " scan-mark-selected" : "";
    const cls = `${bandClass(r.band)}${selected}`;
    parts.push(
      `<mark class="${cls}" data-scan-sentence="${r.index}" tabindex="0">${escapeHtml(
        text.slice(r.start, r.end)
      )}</mark>`
    );
    cursor = r.end;
  }
  if (cursor < text.length) {
    parts.push(escapeHtml(text.slice(cursor)));
  }
  return parts.join("");
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Apply scan marks to an HTML root by walking text nodes and wrapping matches.
 * Skips text inside existing user / TTS marks.
 */
export function applyScanMarksToRoot(
  root: HTMLElement,
  sentences: ScanSentence[],
  selectedIndex: number | null
): void {
  // Remove previous scan marks (unwrap)
  root.querySelectorAll("mark[data-scan-sentence]").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });

  if (!sentences.length) return;

  const plain = root.textContent || "";
  const ranges = matchSentencesInText(plain, sentences);
  if (!ranges.length) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const textNodes: { node: Text; start: number; end: number }[] = [];
  let offset = 0;
  let node = walker.nextNode();
  while (node) {
    const text = node.textContent || "";
    if (text.length) {
      textNodes.push({ node: node as Text, start: offset, end: offset + text.length });
      offset += text.length;
    }
    node = walker.nextNode();
  }

  // Apply from end so earlier offsets stay valid within the node list snapshot
  const sorted = [...ranges].sort((a, b) => b.start - a.start);
  for (const r of sorted) {
    wrapRangeAcrossNodes(textNodes, r, selectedIndex);
  }
}

function wrapRangeAcrossNodes(
  textNodes: { node: Text; start: number; end: number }[],
  range: ScanTextRange,
  selectedIndex: number | null
): void {
  const intersecting = textNodes.filter(
    (tn) => range.end > tn.start && range.start < tn.end
  );
  if (!intersecting.length) return;

  // If any piece sits inside a protected mark, skip the whole sentence
  for (const tn of intersecting) {
    const parentEl = tn.node.parentElement;
    if (
      parentEl?.closest(
        "mark[data-highlight-id], mark.tts-sentence, mark.tts-word, mark[data-scan-sentence]"
      )
    ) {
      return;
    }
  }

  try {
    const first = intersecting[0]!;
    const last = intersecting[intersecting.length - 1]!;
    const startOffset = Math.max(0, range.start - first.start);
    const endOffset = Math.min(last.node.textContent!.length, range.end - last.start);

    const domRange = document.createRange();
    domRange.setStart(first.node, startOffset);
    domRange.setEnd(last.node, endOffset);

    const mark = document.createElement("mark");
    mark.className = `${bandClass(range.band)}${
      selectedIndex === range.index ? " scan-mark-selected" : ""
    }`;
    mark.dataset.scanSentence = String(range.index);
    mark.tabIndex = 0;

    domRange.surroundContents(mark);
  } catch {
    // surroundContents fails across element boundaries — fall back to per-node wrap
    for (const tn of intersecting) {
      const localStart = Math.max(0, range.start - tn.start);
      const localEnd = Math.min(tn.node.textContent!.length, range.end - tn.start);
      if (localStart >= localEnd) continue;
      try {
        const textNode = tn.node;
        const full = textNode.textContent || "";
        const before = full.slice(0, localStart);
        const mid = full.slice(localStart, localEnd);
        const after = full.slice(localEnd);
        if (!mid) continue;

        const mark = document.createElement("mark");
        mark.className = `${bandClass(range.band)}${
          selectedIndex === range.index ? " scan-mark-selected" : ""
        }`;
        mark.dataset.scanSentence = String(range.index);
        mark.tabIndex = 0;
        mark.textContent = mid;

        const frag = document.createDocumentFragment();
        if (before) frag.appendChild(document.createTextNode(before));
        frag.appendChild(mark);
        if (after) frag.appendChild(document.createTextNode(after));
        textNode.parentNode?.replaceChild(frag, textNode);
      } catch {
        /* ignore */
      }
    }
  }
}

export function scrollToScanSentence(root: HTMLElement | null, index: number): void {
  if (!root) return;
  const el = root.querySelector(`[data-scan-sentence="${index}"]`) as HTMLElement | null;
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
}

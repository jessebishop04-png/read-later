/** Clear ephemeral TTS highlight marks from article prose. */
export function clearTtsMarks(root: HTMLElement) {
  root.querySelectorAll("mark.tts-sentence, mark.tts-word").forEach((mark) => {
    const parent = mark.parentNode;
    if (!parent) return;
    while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
    parent.removeChild(mark);
    parent.normalize();
  });
  root.querySelectorAll(".tts-active-block").forEach((el) => {
    el.classList.remove("tts-active-block");
  });
}

/**
 * Wrap [start, end) character offsets inside a block with temporary TTS marks.
 * Works across nested text nodes (existing user highlights).
 */
export function wrapTtsRange(
  block: HTMLElement,
  start: number,
  end: number,
  className: "tts-sentence" | "tts-word"
): void {
  if (end <= start) return;
  const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
  let acc = 0;
  const pieces: { node: Text; from: number; to: number }[] = [];
  let n: Node | null;

  while ((n = walker.nextNode())) {
    const text = n.textContent ?? "";
    const nodeLen = text.length;
    const nodeStart = acc;
    const nodeEnd = acc + nodeLen;
    const overlapStart = Math.max(start, nodeStart);
    const overlapEnd = Math.min(end, nodeEnd);
    if (overlapStart < overlapEnd) {
      pieces.push({
        node: n as Text,
        from: overlapStart - nodeStart,
        to: overlapEnd - nodeStart,
      });
    }
    acc += nodeLen;
    if (acc >= end) break;
  }

  // Wrap from the end so earlier offsets stay valid.
  for (let i = pieces.length - 1; i >= 0; i--) {
    const { node, from, to } = pieces[i]!;
    if (from === 0 && to === (node.textContent?.length ?? 0)) {
      const mark = document.createElement("mark");
      mark.className = className;
      mark.setAttribute("data-tts", "1");
      node.parentNode?.insertBefore(mark, node);
      mark.appendChild(node);
      continue;
    }
    try {
      const range = document.createRange();
      range.setStart(node, from);
      range.setEnd(node, to);
      const mark = document.createElement("mark");
      mark.className = className;
      mark.setAttribute("data-tts", "1");
      range.surroundContents(mark);
    } catch {
      /* skip awkward boundaries */
    }
  }
}

export function applyTtsHighlight(
  root: HTMLElement,
  highlight: {
    paragraphId: number | null;
    sentenceStart: number;
    sentenceEnd: number;
    wordStart: number | null;
    wordEnd: number | null;
  } | null
) {
  clearTtsMarks(root);
  if (!highlight || highlight.paragraphId == null) return;
  const block = root.querySelector(
    `[data-pid="${highlight.paragraphId}"]`
  ) as HTMLElement | null;
  if (!block) return;
  block.classList.add("tts-active-block");
  wrapTtsRange(block, highlight.sentenceStart, highlight.sentenceEnd, "tts-sentence");
  if (
    highlight.wordStart != null &&
    highlight.wordEnd != null &&
    highlight.wordEnd > highlight.wordStart
  ) {
    wrapTtsRange(block, highlight.wordStart, highlight.wordEnd, "tts-word");
  }
}

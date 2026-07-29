"use client";

import { useEffect, useMemo, useRef } from "react";
import type { ScanSentence } from "@/lib/scan-types";
import {
  matchSentencesInText,
  renderHighlightedPlainText,
  scrollToScanSentence,
} from "@/lib/scan-highlight";

type Props = {
  text: string;
  sentences: ScanSentence[];
  selectedIndex: number | null;
  onSelectSentence: (index: number) => void;
};

/** Read-only document view with GPTZero-style sentence color bands. */
export function ScanHighlightedDoc({
  text,
  sentences,
  selectedIndex,
  onSelectSentence,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  const ranges = useMemo(
    () => matchSentencesInText(text, sentences),
    [text, sentences]
  );

  const html = useMemo(
    () => renderHighlightedPlainText(text, ranges, selectedIndex),
    [text, ranges, selectedIndex]
  );

  useEffect(() => {
    if (selectedIndex == null) return;
    scrollToScanSentence(rootRef.current, selectedIndex);
  }, [selectedIndex]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const mark = target?.closest?.("[data-scan-sentence]") as HTMLElement | null;
      if (!mark) return;
      const idx = Number(mark.dataset.scanSentence);
      if (Number.isFinite(idx)) onSelectSentence(idx);
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [onSelectSentence]);

  return (
    <div
      ref={rootRef}
      className="scan-highlighted-doc min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-[color:var(--keepr-border)] bg-[color:var(--keepr-elevated)] px-5 py-5 scrollbar-hide sm:px-6"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

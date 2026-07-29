"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useReadChrome } from "@/components/read-chrome-context";
import { CustomReviewerModal } from "@/components/review/custom-reviewer-modal";
import {
  firstAvailableResultTab,
  ScanResultTabs,
  type ScanResultTabId,
} from "@/components/scan/scan-result-tabs";
import { ScanToolTabs } from "@/components/scan/scan-tool-tabs";
import type { PlagiarismResultPayload } from "@/lib/plagiarism-types";
import type { ReviewResultPayload } from "@/lib/review-presets";
import { runMultiToolScan } from "@/lib/run-multi-tool-scan";
import type { ScanResultPayload, ScanTypeId } from "@/lib/scan-types";
import { wordCount } from "@/lib/scan-types";

type Props = {
  itemId: string;
  title: string;
  contentText: string | null;
  userName?: string | null;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function ReaderScanPanel({ itemId, title, contentText }: Props) {
  const { setReaderScanOverlay } = useReadChrome();
  const text = useMemo(() => (contentText || "").trim(), [contentText]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<ScanResultPayload | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResultPayload | null>(null);
  const [plagiarismResult, setPlagiarismResult] =
    useState<PlagiarismResultPayload | null>(null);
  const [resultTab, setResultTab] = useState<ScanResultTabId>("advanced_ai");
  const [lastScans, setLastScans] = useState<ScanTypeId[]>([]);
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [scanRes, reviewRes, plagRes] = await Promise.all([
          fetch(`/api/scan?itemId=${encodeURIComponent(itemId)}`, {
            credentials: "include",
          }),
          fetch(`/api/review?itemId=${encodeURIComponent(itemId)}`, {
            credentials: "include",
          }),
          fetch(`/api/plagiarism?itemId=${encodeURIComponent(itemId)}`, {
            credentials: "include",
          }),
        ]);
        const scanData = (await scanRes.json()) as {
          result?: ScanResultPayload | null;
          scansRun?: ScanTypeId[];
        };
        const reviewData = (await reviewRes.json()) as {
          result?: ReviewResultPayload | null;
        };
        const plagData = (await plagRes.json()) as {
          result?: PlagiarismResultPayload | null;
        };
        if (scanData.result) {
          setAiResult(scanData.result);
          setLastScans(scanData.scansRun || ["advanced_ai"]);
        }
        if (reviewData.result) setReviewResult(reviewData.result);
        if (plagData.result) setPlagiarismResult(plagData.result);
        const tab = firstAvailableResultTab({
          aiResult: scanData.result,
          reviewResult: reviewData.result,
          plagiarismResult: plagData.result,
          lastScans: scanData.scansRun || undefined,
        });
        if (tab) setResultTab(tab);
      } catch {
        /* ignore */
      }
    })();
  }, [itemId]);

  const showSentences =
    resultTab === "advanced_ai" && (aiResult?.sentences.length ?? 0) > 0;

  const setSelectedIndex = useCallback((index: number | null) => {
    setSelectedSentence(index);
  }, []);

  useEffect(() => {
    if (aiResult && showSentences && aiResult.sentences.length > 0) {
      setReaderScanOverlay({
        sentences: aiResult.sentences,
        selectedIndex: selectedSentence,
        setSelectedIndex,
      });
    } else {
      setReaderScanOverlay(null);
    }
  }, [aiResult, showSentences, selectedSentence, setSelectedIndex, setReaderScanOverlay]);

  useEffect(() => {
    return () => setReaderScanOverlay(null);
  }, [setReaderScanOverlay]);

  const applyOutcome = useCallback(
    (outcome: Awaited<ReturnType<typeof runMultiToolScan>>, preferTab?: ScanResultTabId) => {
      setAiResult(outcome.aiResult);
      setReviewResult(outcome.reviewResult);
      setPlagiarismResult(outcome.plagiarismResult);
      setLastScans(outcome.lastScans);
      if (preferTab) setResultTab(preferTab);
      else if (outcome.resultTab) setResultTab(outcome.resultTab);
      if (outcome.aiResult) setSelectedSentence(null);
      if (outcome.errors.length) setError(outcome.errors.join(" · "));
    },
    []
  );

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    try {
      const outcome = await runMultiToolScan({
        text,
        selected: [resultTab],
        itemId,
        title,
        source: "item",
        prev: { aiResult, reviewResult, plagiarismResult },
      });
      applyOutcome(outcome, resultTab);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setScanning(false);
    }
  }, [aiResult, applyOutcome, itemId, plagiarismResult, resultTab, reviewResult, text, title]);

  const activateTab = useCallback(
    async (tab: ScanResultTabId) => {
      setResultTab(tab);
      if (scanning) return;

      const alreadyHas =
        (tab === "advanced_ai" && aiResult && lastScans.includes("advanced_ai")) ||
        (tab === "ai" && aiResult && lastScans.includes("ai")) ||
        (tab === "writing_feedback" && reviewResult) ||
        (tab === "plagiarism" && plagiarismResult);
      if (alreadyHas) return;

      setScanning(true);
      setError(null);
      try {
        const outcome = await runMultiToolScan({
          text,
          selected: [tab],
          itemId,
          title,
          source: "item",
          prev: { aiResult, reviewResult, plagiarismResult },
        });
        applyOutcome(outcome, tab);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Check failed");
      } finally {
        setScanning(false);
      }
    },
    [
      aiResult,
      applyOutcome,
      itemId,
      lastScans,
      plagiarismResult,
      reviewResult,
      scanning,
      text,
      title,
    ]
  );

  if (!text) {
    return (
      <div className="space-y-3 px-4 py-5">
        <p className="text-[13px] text-[color:var(--keepr-muted)]">
          No plain text is available for this item yet. Open a text article or paste content on the{" "}
          <a href="/check" className="text-sky-400 hover:text-sky-300">
            Advanced AI Scan
          </a>{" "}
          page.
        </p>
      </div>
    );
  }

  const chars = text.length;
  const words = wordCount(text);

  return (
    <div className="flex min-h-full flex-col">
      <div className="shrink-0 border-b border-[color:var(--keepr-border)] px-1">
        <ScanToolTabs
          resultTab={resultTab}
          onActivateTab={(tab) => void activateTab(tab)}
          scanning={scanning}
          aiResult={aiResult}
          reviewResult={reviewResult}
          plagiarismResult={plagiarismResult}
          lastScans={lastScans}
        />
      </div>

      {error ? (
        <p className="mx-4 mt-3 rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="min-h-0 flex-1">
        <ScanResultTabs
          hideTabs
          aiResult={aiResult}
          reviewResult={reviewResult}
          plagiarismResult={plagiarismResult}
          lastScans={lastScans}
          resultTab={resultTab}
          onActivateTab={(tab) => void activateTab(tab)}
          scanning={scanning}
          showSentences={showSentences}
          selectedSentence={selectedSentence}
          onSelectSentence={setSelectedSentence}
          onClearAi={() => {
            setAiResult(null);
            setSelectedSentence(null);
            setLastScans((prev) =>
              prev.filter((x) => x !== "advanced_ai" && x !== "ai")
            );
          }}
          onClearReview={() => setReviewResult(null)}
          onClearPlagiarism={() => setPlagiarismResult(null)}
          onCustomizeReviewer={() => setReviewerOpen(true)}
        />
      </div>

      <div className="shrink-0 border-t border-[color:var(--keepr-border)] px-4 py-3">
        <div className="flex items-end justify-between gap-3">
          <p className="min-w-0 text-[11px] leading-snug text-[color:var(--keepr-faint)]">
            {chars.toLocaleString()} characters
            <span className="mx-1">·</span>
            {words.toLocaleString()} words
          </p>
          <button
            type="button"
            onClick={() => void runScan()}
            disabled={scanning || chars < 50}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {scanning ? (
              <>
                <span
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black"
                  aria-hidden
                />
                Scanning
              </>
            ) : (
              <>
                Scan
                <span aria-hidden>→</span>
              </>
            )}
          </button>
        </div>
      </div>

      <CustomReviewerModal
        open={reviewerOpen}
        onClose={() => setReviewerOpen(false)}
        text={text}
        itemId={itemId}
        source="item"
        onComplete={(r) => {
          setReviewResult(r);
          setResultTab("writing_feedback");
        }}
      />
    </div>
  );
}

export function textForScan(contentText: string | null, contentHtml?: string | null): string {
  if (contentText?.trim()) return contentText.trim();
  if (contentHtml?.trim()) return stripHtml(contentHtml);
  return "";
}

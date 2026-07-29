"use client";

import { useCallback, useEffect, useState } from "react";
import { useReadChrome } from "@/components/read-chrome-context";
import { CustomReviewerModal } from "@/components/review/custom-reviewer-modal";
import { ScanEditor } from "@/components/scan/scan-editor";
import { ScanHighlightedDoc } from "@/components/scan/scan-highlighted-doc";
import {
  ScanResultTabs,
  type ScanResultTabId,
} from "@/components/scan/scan-result-tabs";
import { ScanToolTabs } from "@/components/scan/scan-tool-tabs";
import type { PlagiarismResultPayload } from "@/lib/plagiarism-types";
import type { ReviewResultPayload } from "@/lib/review-presets";
import { runMultiToolScan } from "@/lib/run-multi-tool-scan";
import type { ScanResultPayload, ScanTypeId } from "@/lib/scan-types";

type Props = {
  userName?: string | null;
};

export function ScanWorkspace({ userName }: Props) {
  const { setScanPanel } = useReadChrome();
  const [text, setText] = useState("");
  const [selected, setSelected] = useState<ScanTypeId[]>(["advanced_ai"]);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<ScanResultPayload | null>(null);
  const [reviewResult, setReviewResult] = useState<ReviewResultPayload | null>(null);
  const [plagiarismResult, setPlagiarismResult] =
    useState<PlagiarismResultPayload | null>(null);
  const [resultTab, setResultTab] = useState<ScanResultTabId>("advanced_ai");
  const [lastScans, setLastScans] = useState<ScanTypeId[]>([]);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [reviewerOpen, setReviewerOpen] = useState(false);
  const [selectedSentence, setSelectedSentence] = useState<number | null>(null);
  const [editing, setEditing] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/scan", { credentials: "include" });
        const data = (await res.json()) as { configured?: boolean };
        setConfigured(Boolean(data.configured));
      } catch {
        setConfigured(null);
      }
    })();
  }, []);

  const toggle = useCallback((id: ScanTypeId) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const applyOutcome = useCallback(
    (outcome: Awaited<ReturnType<typeof runMultiToolScan>>, preferTab?: ScanResultTabId) => {
      setAiResult(outcome.aiResult);
      setReviewResult(outcome.reviewResult);
      setPlagiarismResult(outcome.plagiarismResult);
      setLastScans(outcome.lastScans);
      if (preferTab) setResultTab(preferTab);
      else if (outcome.resultTab) setResultTab(outcome.resultTab);
      if (typeof outcome.configured === "boolean") setConfigured(outcome.configured);
      if (outcome.aiResult) {
        setSelectedSentence(null);
        setEditing(false);
      }
      if (outcome.errors.length) setError(outcome.errors.join(" · "));
    },
    []
  );

  const runScan = useCallback(async () => {
    setScanning(true);
    setError(null);
    const tools: ScanTypeId[] = [resultTab];
    setSelected(tools);
    try {
      const outcome = await runMultiToolScan({
        text,
        selected: tools,
        source: "paste",
        prev: { aiResult, reviewResult, plagiarismResult },
      });
      applyOutcome(outcome, resultTab);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed");
    } finally {
      setScanning(false);
    }
  }, [aiResult, applyOutcome, plagiarismResult, resultTab, reviewResult, text]);

  const activateTab = useCallback(
    async (tab: ScanResultTabId) => {
      setResultTab(tab);
      setSelected([tab]);
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
          source: "paste",
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
      lastScans,
      plagiarismResult,
      reviewResult,
      scanning,
      text,
    ]
  );

  const openReviewer = useCallback(() => setReviewerOpen(true), []);

  const clearAi = useCallback(() => {
    setAiResult(null);
    setSelectedSentence(null);
    setEditing(true);
    setLastScans((prev) => prev.filter((x) => x !== "advanced_ai" && x !== "ai"));
  }, []);

  const clearReview = useCallback(() => {
    setReviewResult(null);
  }, []);

  const clearPlagiarism = useCallback(() => {
    setPlagiarismResult(null);
  }, []);

  const showSentences =
    resultTab === "advanced_ai" && (aiResult?.sentences.length ?? 0) > 0;
  const hasSentenceView =
    Boolean(aiResult) && showSentences && (aiResult?.sentences.length ?? 0) > 0;

  useEffect(() => {
    setScanPanel({
      userName,
      selected,
      onToggle: toggle,
      onScan: () => void runScan(),
      onOpenReviewer: openReviewer,
      scanning,
      text,
      configured,
      result: aiResult,
      aiResult,
      reviewResult,
      plagiarismResult,
      resultTab,
      onActivateResultTab: (tab) => void activateTab(tab),
      onSelectResultTab: setResultTab,
      lastScans,
      showSentences,
      selectedSentence,
      onSelectSentence: setSelectedSentence,
      onClearResult: clearAi,
      onClearReview: clearReview,
      onClearPlagiarism: clearPlagiarism,
    });
    return () => setScanPanel(null);
  }, [
    setScanPanel,
    userName,
    selected,
    toggle,
    runScan,
    activateTab,
    openReviewer,
    scanning,
    text,
    configured,
    aiResult,
    reviewResult,
    plagiarismResult,
    resultTab,
    lastScans,
    showSentences,
    selectedSentence,
    clearAi,
    clearReview,
    clearPlagiarism,
  ]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-col px-4 py-4 sm:px-6 lg:px-8">
      {error ? (
        <p className="mb-4 shrink-0 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {hasSentenceView && !editing ? (
          <>
            <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
              <p className="text-[12px] text-[color:var(--keepr-muted)]">
                Highlighted scan view — click a sentence to inspect it in the sidebar.
              </p>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="shrink-0 text-[12px] font-medium text-sky-400 hover:text-sky-300"
              >
                Edit text
              </button>
            </div>
            <ScanHighlightedDoc
              text={text}
              sentences={aiResult!.sentences}
              selectedIndex={selectedSentence}
              onSelectSentence={setSelectedSentence}
            />
          </>
        ) : (
          <>
            {hasSentenceView ? (
              <div className="mb-3 flex shrink-0 justify-end">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="text-[12px] font-medium text-sky-400 hover:text-sky-300"
                >
                  Show highlights
                </button>
              </div>
            ) : null}
            <ScanEditor value={text} onChange={setText} disabled={scanning} />
          </>
        )}
      </div>

      <div className="mt-6 shrink-0 space-y-0 overflow-hidden rounded-xl border border-[color:var(--keepr-border)] lg:hidden">
        <div className="border-b border-[color:var(--keepr-border)] px-1">
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
        <div className="max-h-[45vh]">
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
            onClearAi={clearAi}
            onClearReview={clearReview}
            onClearPlagiarism={clearPlagiarism}
            onCustomizeReviewer={openReviewer}
          />
        </div>
        <div className="flex items-end justify-between gap-3 border-t border-[color:var(--keepr-border)] px-4 py-3">
          <p className="text-[11px] text-[color:var(--keepr-faint)]">
            {text.trim().length.toLocaleString()} characters
          </p>
          <button
            type="button"
            onClick={() => void runScan()}
            disabled={scanning || text.trim().length < 50}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black disabled:opacity-40"
          >
            {scanning ? "Scanning" : "Scan"}
          </button>
        </div>
      </div>

      <CustomReviewerModal
        open={reviewerOpen}
        onClose={() => setReviewerOpen(false)}
        text={text}
        source="paste"
        onComplete={(r) => {
          setReviewResult(r);
          setResultTab("writing_feedback");
        }}
      />
    </div>
  );
}

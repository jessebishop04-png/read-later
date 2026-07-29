"use client";

import { ReviewResultsView } from "@/components/review/review-results-view";
import { PlagiarismResultsView } from "@/components/scan/plagiarism-results-view";
import { ScanAnalysisPanel } from "@/components/scan/scan-results-view";
import type { PlagiarismResultPayload } from "@/lib/plagiarism-types";
import type { ReviewResultPayload } from "@/lib/review-presets";
import {
  ALL_SCAN_RESULT_TABS,
  firstAvailableResultTab,
  SCAN_RESULT_TAB_LABELS,
  type ScanResultTabId,
} from "@/lib/scan-result-tabs";
import type { ScanResultPayload, ScanTypeId } from "@/lib/scan-types";

export type { ScanResultTabId };
export {
  ALL_SCAN_RESULT_TABS,
  firstAvailableResultTab,
  SCAN_RESULT_TAB_LABELS,
};

type Props = {
  aiResult?: ScanResultPayload | null;
  reviewResult?: ReviewResultPayload | null;
  plagiarismResult?: PlagiarismResultPayload | null;
  lastScans?: ScanTypeId[];
  resultTab: ScanResultTabId;
  onActivateTab: (tab: ScanResultTabId) => void;
  scanning?: boolean;
  showSentences?: boolean;
  selectedSentence?: number | null;
  onSelectSentence?: (index: number) => void;
  onClearAi?: () => void;
  onClearReview?: () => void;
  onClearPlagiarism?: () => void;
  onCustomizeReviewer?: () => void;
  /** When true, omit outer tab row (tabs live in panel header). */
  hideTabs?: boolean;
};

export function ScanResultTabs({
  aiResult,
  reviewResult,
  plagiarismResult,
  resultTab,
  scanning = false,
  showSentences,
  selectedSentence,
  onSelectSentence,
  onClearAi,
  onClearReview,
  onClearPlagiarism,
  onCustomizeReviewer,
}: Props) {
  const active = ALL_SCAN_RESULT_TABS.includes(resultTab)
    ? resultTab
    : "advanced_ai";

  const showAiPanel = active === "advanced_ai" || active === "ai";
  const title = SCAN_RESULT_TAB_LABELS[active];
  const showOuterTitle = !showAiPanel;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showOuterTitle ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[color:var(--keepr-border)] px-4 py-3">
          <h2 className="text-[15px] font-semibold tracking-tight text-keepr">{title}</h2>
          {active === "writing_feedback" && onCustomizeReviewer ? (
            <button
              type="button"
              onClick={onCustomizeReviewer}
              className="text-[12px] font-medium text-sky-400 hover:text-sky-300"
            >
              Customize
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 scrollbar-hide">
        {scanning ? (
          <div className="flex flex-col items-center gap-4 py-10 text-center">
            <span
              className="h-8 w-8 animate-spin rounded-full border-2 border-sky-400/30 border-t-sky-400"
              aria-hidden
            />
            <p className="text-[13px] text-[color:var(--keepr-muted)]">
              Running {title.toLowerCase()}…
            </p>
          </div>
        ) : null}

        {!scanning && showAiPanel && aiResult ? (
          <ScanAnalysisPanel
            result={aiResult}
            showSentences={
              active === "advanced_ai" &&
              (showSentences || (aiResult.sentences.length ?? 0) > 0)
            }
            selectedIndex={selectedSentence ?? null}
            onSelectSentence={onSelectSentence}
            onClear={onClearAi}
          />
        ) : null}

        {!scanning && active === "writing_feedback" && reviewResult ? (
          <div className="space-y-3">
            <ReviewResultsView result={reviewResult} />
            {onClearReview ? (
              <button
                type="button"
                onClick={onClearReview}
                className="text-[12px] text-sky-400 hover:text-sky-300"
              >
                Clear feedback
              </button>
            ) : null}
          </div>
        ) : null}

        {!scanning && active === "plagiarism" && plagiarismResult ? (
          <PlagiarismResultsView
            result={plagiarismResult}
            onClear={onClearPlagiarism}
          />
        ) : null}

        {!scanning && showAiPanel && !aiResult ? <EmptyHint tool={title} /> : null}
        {!scanning && active === "writing_feedback" && !reviewResult ? (
          <EmptyHint tool={title} />
        ) : null}
        {!scanning && active === "plagiarism" && !plagiarismResult ? (
          <EmptyHint tool={title} />
        ) : null}
      </div>
    </div>
  );
}

function EmptyHint({ tool }: { tool: string }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <p className="text-[14px] font-medium text-keepr">{tool}</p>
      <p className="max-w-[16rem] text-[13px] leading-relaxed text-[color:var(--keepr-muted)]">
        Paste text on the left, then press Scan to run this check.
      </p>
    </div>
  );
}

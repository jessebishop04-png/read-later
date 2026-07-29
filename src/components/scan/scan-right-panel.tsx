"use client";

import { RightPanelShell } from "@/components/right-panel-shell";
import { ScanResultTabs } from "@/components/scan/scan-result-tabs";
import { ScanToolTabs } from "@/components/scan/scan-tool-tabs";
import { useReadChrome } from "@/components/read-chrome-context";
import { wordCount } from "@/lib/scan-types";

export function ScanRightPanel() {
  const { scanPanel, rightPanelOpen: open } = useReadChrome();
  if (!scanPanel) return null;

  const aiResult = scanPanel.aiResult ?? scanPanel.result ?? null;
  const resultTab = scanPanel.resultTab ?? "advanced_ai";
  const activate =
    scanPanel.onActivateResultTab ??
    scanPanel.onSelectResultTab ??
    (() => {});
  const chars = scanPanel.text.trim().length;
  const words = wordCount(scanPanel.text);
  const canScan = !scanPanel.scanning && chars >= 50;

  return (
    <RightPanelShell
      ariaLabel="Scan analysis"
      fill
      widthOpen={380}
      header={
        <div
          className={`min-w-0 flex-1 pr-1 ${open ? "" : "pointer-events-none invisible"}`}
        >
          <ScanToolTabs
            resultTab={resultTab}
            onActivateTab={activate}
            scanning={scanPanel.scanning}
            aiResult={aiResult}
            reviewResult={scanPanel.reviewResult}
            plagiarismResult={scanPanel.plagiarismResult}
            lastScans={scanPanel.lastScans}
          />
        </div>
      }
    >
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <ScanResultTabs
            hideTabs
            aiResult={aiResult}
            reviewResult={scanPanel.reviewResult}
            plagiarismResult={scanPanel.plagiarismResult}
            lastScans={scanPanel.lastScans}
            resultTab={resultTab}
            onActivateTab={activate}
            scanning={scanPanel.scanning}
            showSentences={scanPanel.showSentences}
            selectedSentence={scanPanel.selectedSentence ?? null}
            onSelectSentence={scanPanel.onSelectSentence}
            onClearAi={scanPanel.onClearResult}
            onClearReview={scanPanel.onClearReview}
            onClearPlagiarism={scanPanel.onClearPlagiarism}
            onCustomizeReviewer={scanPanel.onOpenReviewer}
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
              onClick={scanPanel.onScan}
              disabled={!canScan}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {scanPanel.scanning ? (
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
          {scanPanel.configured === false ? (
            <p className="mt-2 text-[11px] leading-snug text-amber-200/90">
              Add GPTZERO_API_KEY / OPENAI_API_KEY in .env to enable scans.
            </p>
          ) : null}
        </div>
      </div>
    </RightPanelShell>
  );
}

import type { PlagiarismResultPayload } from "@/lib/plagiarism-types";
import type { ReviewResultPayload } from "@/lib/review-presets";
import type { ScanResultPayload, ScanTypeId } from "@/lib/scan-types";

/** Top analysis tabs — one per scan tool. */
export type ScanResultTabId = ScanTypeId;

export const ALL_SCAN_RESULT_TABS: ScanResultTabId[] = [
  "advanced_ai",
  "ai",
  "writing_feedback",
  "plagiarism",
];

export const SCAN_RESULT_TAB_LABELS: Record<ScanResultTabId, string> = {
  advanced_ai: "Advanced",
  ai: "AI",
  writing_feedback: "Feedback",
  plagiarism: "Plagiarism",
};

export function tabHasResult(
  tab: ScanResultTabId,
  opts: {
    aiResult?: ScanResultPayload | null;
    reviewResult?: ReviewResultPayload | null;
    plagiarismResult?: PlagiarismResultPayload | null;
    lastScans?: ScanTypeId[];
  }
): boolean {
  if (tab === "advanced_ai") {
    return Boolean(opts.aiResult && opts.lastScans?.includes("advanced_ai"));
  }
  if (tab === "ai") {
    return Boolean(opts.aiResult && opts.lastScans?.includes("ai"));
  }
  if (tab === "writing_feedback") return Boolean(opts.reviewResult);
  return Boolean(opts.plagiarismResult);
}

/** Prefer the tool that just ran; else first tab that has data. */
export function firstAvailableResultTab(opts: {
  aiResult?: ScanResultPayload | null;
  reviewResult?: ReviewResultPayload | null;
  plagiarismResult?: PlagiarismResultPayload | null;
  lastScans?: ScanTypeId[];
  prefer?: ScanResultTabId[];
}): ScanResultTabId | null {
  const prefer = opts.prefer?.length
    ? opts.prefer
    : opts.lastScans?.length
      ? opts.lastScans
      : ALL_SCAN_RESULT_TABS;

  for (const tab of prefer) {
    if (tab === "advanced_ai" && opts.aiResult) return "advanced_ai";
    if (tab === "ai" && opts.aiResult) return "ai";
    if (tab === "writing_feedback" && opts.reviewResult) return "writing_feedback";
    if (tab === "plagiarism" && opts.plagiarismResult) return "plagiarism";
  }

  if (opts.aiResult) {
    if (opts.lastScans?.includes("advanced_ai")) return "advanced_ai";
    if (opts.lastScans?.includes("ai")) return "ai";
    return "advanced_ai";
  }
  if (opts.reviewResult) return "writing_feedback";
  if (opts.plagiarismResult) return "plagiarism";
  return null;
}

/** @deprecated Use ALL_SCAN_RESULT_TABS — tabs are always shown. */
export function availableScanResultTabs(opts: {
  aiResult?: ScanResultPayload | null;
  reviewResult?: ReviewResultPayload | null;
  plagiarismResult?: PlagiarismResultPayload | null;
}): ScanResultTabId[] {
  const tabs: ScanResultTabId[] = [];
  if (opts.aiResult) tabs.push("advanced_ai");
  if (opts.reviewResult) tabs.push("writing_feedback");
  if (opts.plagiarismResult) tabs.push("plagiarism");
  return tabs.length ? tabs : [...ALL_SCAN_RESULT_TABS];
}

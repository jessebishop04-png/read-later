import {
  firstAvailableResultTab,
  type ScanResultTabId,
} from "@/lib/scan-result-tabs";
import type { PlagiarismResultPayload } from "@/lib/plagiarism-types";
import type { ReviewResultPayload } from "@/lib/review-presets";
import {
  DETECTION_SCAN_TYPES,
  SCAN_MIN_CHARS,
  type ScanResultPayload,
  type ScanTypeId,
} from "@/lib/scan-types";
import { PLAGIARISM_MIN_CHARS } from "@/lib/plagiarism-check-client";
import {
  fetchDefaultReviewTemplateId,
  storeReviewTemplateId,
} from "@/lib/review-template-default";

export type MultiScanOutcome = {
  aiResult: ScanResultPayload | null;
  reviewResult: ReviewResultPayload | null;
  plagiarismResult: PlagiarismResultPayload | null;
  lastScans: ScanTypeId[];
  resultTab: ScanResultTabId | null;
  errors: string[];
  configured?: boolean;
};

type RunOpts = {
  text: string;
  selected: ScanTypeId[];
  itemId?: string;
  title?: string;
  source: "paste" | "item";
  /** Keep previous results for tools that were not selected this run. */
  prev?: {
    aiResult?: ScanResultPayload | null;
    reviewResult?: ReviewResultPayload | null;
    plagiarismResult?: PlagiarismResultPayload | null;
  };
};

async function postDetection(opts: {
  text: string;
  scans: ScanTypeId[];
  itemId?: string;
  title?: string;
  source: "paste" | "item";
}): Promise<{ result: ScanResultPayload; scansRun: ScanTypeId[]; configured?: boolean }> {
  const res = await fetch("/api/scan", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: opts.text,
      title: opts.title,
      itemId: opts.itemId,
      source: opts.source,
      scans: opts.scans,
    }),
  });
  const data = (await res.json()) as {
    error?: string;
    result?: ScanResultPayload;
    scansRun?: ScanTypeId[];
    configured?: boolean;
  };
  if (!res.ok) throw new Error(data.error || "AI scan failed");
  if (!data.result) throw new Error("No AI scan result");
  return {
    result: data.result,
    scansRun: data.scansRun || opts.scans,
    configured: data.configured,
  };
}

async function postReview(opts: {
  text: string;
  itemId?: string;
  source: "paste" | "item";
}): Promise<ReviewResultPayload> {
  const templateId = await fetchDefaultReviewTemplateId();
  if (!templateId) {
    throw new Error("No Writing Feedback templates available");
  }
  const res = await fetch("/api/review", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: opts.text,
      itemId: opts.itemId,
      source: opts.source,
      templateId,
    }),
  });
  const data = (await res.json()) as {
    error?: string;
    result?: ReviewResultPayload;
  };
  if (!res.ok) throw new Error(data.error || "Writing Feedback failed");
  if (!data.result) throw new Error("No Writing Feedback result");
  storeReviewTemplateId(templateId);
  return data.result;
}

async function postPlagiarism(opts: {
  text: string;
  itemId?: string;
  source: "paste" | "item";
}): Promise<PlagiarismResultPayload> {
  const res = await fetch("/api/plagiarism", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: opts.text,
      itemId: opts.itemId,
      source: opts.source,
    }),
  });
  const data = (await res.json()) as {
    error?: string;
    result?: PlagiarismResultPayload;
  };
  if (!res.ok) throw new Error(data.error || "Plagiarism check failed");
  if (!data.result) throw new Error("No plagiarism result");
  return data.result;
}

/** Run selected Advanced AI / Writing Feedback / Plagiarism tools in parallel. */
export async function runMultiToolScan(opts: RunOpts): Promise<MultiScanOutcome> {
  const text = opts.text.trim();
  const detection = opts.selected.filter((id) => DETECTION_SCAN_TYPES.includes(id));
  const wantFeedback = opts.selected.includes("writing_feedback");
  const wantPlagiarism = opts.selected.includes("plagiarism");

  if (!detection.length && !wantFeedback && !wantPlagiarism) {
    throw new Error("Select at least one scan option");
  }

  if (detection.length && text.length < SCAN_MIN_CHARS) {
    throw new Error(
      `Enter at least ${SCAN_MIN_CHARS} characters for AI detection`
    );
  }
  if (wantFeedback && text.length < 50) {
    throw new Error("Enter at least 50 characters for Writing Feedback");
  }
  if (wantPlagiarism && text.length < PLAGIARISM_MIN_CHARS) {
    throw new Error(
      `Enter at least ${PLAGIARISM_MIN_CHARS} characters for plagiarism check`
    );
  }

  const errors: string[] = [];
  let aiResult = opts.prev?.aiResult ?? null;
  let reviewResult = opts.prev?.reviewResult ?? null;
  let plagiarismResult = opts.prev?.plagiarismResult ?? null;
  let lastScans: ScanTypeId[] = detection;
  let configured: boolean | undefined;

  const tasks: Promise<void>[] = [];

  if (detection.length) {
    tasks.push(
      postDetection({
        text,
        scans: detection,
        itemId: opts.itemId,
        title: opts.title,
        source: opts.source,
      })
        .then((r) => {
          aiResult = r.result;
          lastScans = r.scansRun;
          if (typeof r.configured === "boolean") configured = r.configured;
        })
        .catch((e) => {
          errors.push(e instanceof Error ? e.message : "AI scan failed");
        })
    );
  }

  if (wantFeedback) {
    tasks.push(
      postReview({ text, itemId: opts.itemId, source: opts.source })
        .then((r) => {
          reviewResult = r;
        })
        .catch((e) => {
          errors.push(e instanceof Error ? e.message : "Writing Feedback failed");
        })
    );
  }

  if (wantPlagiarism) {
    tasks.push(
      postPlagiarism({ text, itemId: opts.itemId, source: opts.source })
        .then((r) => {
          plagiarismResult = r;
        })
        .catch((e) => {
          errors.push(e instanceof Error ? e.message : "Plagiarism check failed");
        })
    );
  }

  await Promise.all(tasks);

  // Prefer tab for tools that ran this time
  let resultTab: ScanResultTabId | null = null;
  if (detection.includes("advanced_ai") && aiResult) resultTab = "advanced_ai";
  else if (detection.includes("ai") && aiResult) resultTab = "ai";
  else if (wantFeedback && reviewResult) resultTab = "writing_feedback";
  else if (wantPlagiarism && plagiarismResult) resultTab = "plagiarism";
  else {
    resultTab = firstAvailableResultTab({
      aiResult,
      reviewResult,
      plagiarismResult,
      lastScans,
      prefer: opts.selected,
    });
  }

  if (!resultTab && errors.length) {
    throw new Error(errors.join(" · "));
  }

  return {
    aiResult,
    reviewResult,
    plagiarismResult,
    lastScans,
    resultTab,
    errors,
    configured,
  };
}

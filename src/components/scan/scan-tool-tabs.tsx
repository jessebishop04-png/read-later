"use client";

import type { ReactNode } from "react";
import type { ScanResultTabId } from "@/lib/scan-result-tabs";
import { ALL_SCAN_RESULT_TABS, tabHasResult } from "@/lib/scan-result-tabs";
import type { PlagiarismResultPayload } from "@/lib/plagiarism-types";
import type { ReviewResultPayload } from "@/lib/review-presets";
import type { ScanResultPayload, ScanTypeId } from "@/lib/scan-types";

const TAB_META: Record<
  ScanResultTabId,
  { label: string; accent: string; Icon: (p: { className?: string }) => ReactNode }
> = {
  advanced_ai: {
    label: "Advanced",
    accent: "text-emerald-400",
    Icon: IconAdvanced,
  },
  ai: {
    label: "AI",
    accent: "text-sky-400",
    Icon: IconBolt,
  },
  writing_feedback: {
    label: "Feedback",
    accent: "text-violet-400",
    Icon: IconFeedback,
  },
  plagiarism: {
    label: "Plagiarism",
    accent: "text-rose-400",
    Icon: IconPlagiarism,
  },
};

type Props = {
  resultTab: ScanResultTabId;
  onActivateTab: (tab: ScanResultTabId) => void;
  scanning?: boolean;
  aiResult?: ScanResultPayload | null;
  reviewResult?: ReviewResultPayload | null;
  plagiarismResult?: PlagiarismResultPayload | null;
  lastScans?: ScanTypeId[];
};

/** GPTZero-style icon tool tabs for the scan right panel. */
export function ScanToolTabs({
  resultTab,
  onActivateTab,
  scanning = false,
  aiResult,
  reviewResult,
  plagiarismResult,
  lastScans = [],
}: Props) {
  const active = ALL_SCAN_RESULT_TABS.includes(resultTab) ? resultTab : "advanced_ai";

  return (
    <div
      className="flex h-full min-w-0 flex-1 items-stretch gap-px overflow-x-auto scrollbar-hide"
      role="tablist"
      aria-label="Scan tools"
    >
      {ALL_SCAN_RESULT_TABS.map((id) => {
        const meta = TAB_META[id];
        const selected = active === id;
        const hasData = tabHasResult(id, {
          aiResult,
          reviewResult,
          plagiarismResult,
          lastScans,
        });
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            disabled={scanning && !selected}
            onClick={() => onActivateTab(id)}
            className={`relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-1.5 transition ${
              selected
                ? "bg-[color:var(--keepr-elevated)] text-keepr"
                : "text-[color:var(--keepr-faint)] hover:bg-[color:var(--keepr-elevated-hover)] hover:text-[color:var(--keepr-muted)]"
            } ${scanning && !selected ? "opacity-45" : ""}`}
          >
            <span className={`relative ${selected ? meta.accent : ""}`}>
              <meta.Icon className="h-4 w-4" />
              {hasData && !selected ? (
                <span
                  className="absolute -right-1 -top-0.5 h-1.5 w-1.5 rounded-full bg-sky-400"
                  aria-hidden
                />
              ) : null}
            </span>
            <span className="max-w-full truncate text-[10px] font-semibold tracking-tight">
              {meta.label}
            </span>
            {selected ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-sky-400" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function IconAdvanced({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="12" cy="12" r="7" stroke="currentColor" strokeWidth="1.5" opacity="0.7" />
      <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function IconBolt({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M13 2L4 13.5h6.5L11 22l9-11.5h-6.5L13 2z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconFeedback({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6 19l1.5-4.5L16.5 5.5a2.1 2.1 0 013 3L10.5 17.5 6 19z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M14.5 7.5l2 2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function IconPlagiarism({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 4h7l3 3v13a1 1 0 01-1 1H8a1 1 0 01-1-1V5a1 1 0 011-1z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle cx="14.5" cy="13.5" r="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M16.6 15.6L19 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

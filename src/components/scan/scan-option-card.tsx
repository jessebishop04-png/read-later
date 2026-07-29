"use client";

import type { ScanTypeId } from "@/lib/scan-types";

export type ScanOptionDef = {
  id: ScanTypeId;
  title: string;
  description: string;
  runnable: boolean;
  accent: string;
};

export const SCAN_OPTIONS: ScanOptionDef[] = [
  {
    id: "advanced_ai",
    title: "Advanced AI Scan",
    description: "In-depth AI analysis with sentence highlights",
    runnable: true,
    accent: "bg-emerald-500/20 text-emerald-400",
  },
  {
    id: "ai",
    title: "AI Scan",
    description: "Document-level AI detection",
    runnable: true,
    accent: "bg-sky-500/20 text-sky-400",
  },
  {
    id: "writing_feedback",
    title: "Writing Feedback",
    description: "Inline review with your default template",
    runnable: true,
    accent: "bg-violet-500/20 text-violet-400",
  },
  {
    id: "plagiarism",
    title: "Plagiarism Check",
    description: "Originality risk and web matches",
    runnable: true,
    accent: "bg-rose-500/20 text-rose-400",
  },
];

type Props = {
  option: ScanOptionDef;
  selected: boolean;
  onToggle: (id: ScanTypeId) => void;
};

export function ScanOptionCard({ option, selected, onToggle }: Props) {
  const disabled = !option.runnable;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => {
        if (!disabled) onToggle(option.id);
      }}
      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
        selected && !disabled
          ? "border-white/25 bg-[color:var(--keepr-elevated)]"
          : "border-white/10 bg-transparent hover:border-white/20 hover:bg-[color:var(--keepr-elevated-hover)]"
      } ${disabled ? "cursor-not-allowed opacity-55" : ""}`}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${option.accent}`}
        aria-hidden
      >
        {option.id === "advanced_ai"
          ? "AI"
          : option.id === "ai"
            ? "⚡"
            : option.id === "writing_feedback"
              ? "✎"
              : "¶"}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-keepr">{option.title}</span>
        <span className="mt-0.5 block text-[12px] text-[color:var(--keepr-muted)]">
          {option.description}
        </span>
      </span>
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${
          selected && !disabled
            ? "border-sky-400 bg-sky-400 text-black"
            : "border-white/25 bg-transparent"
        }`}
        aria-hidden
      >
        {selected && !disabled ? (
          <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
            <path
              d="M2.5 6.2L4.8 8.5L9.5 3.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </span>
    </button>
  );
}

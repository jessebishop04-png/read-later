"use client";

import type { ScanTypeId } from "@/lib/scan-types";
import { DETECTION_SCAN_TYPES, SCAN_MIN_CHARS, wordCount } from "@/lib/scan-types";
import { PLAGIARISM_MIN_CHARS } from "@/lib/plagiarism-check-client";
import { ScanOptionCard, SCAN_OPTIONS } from "@/components/scan/scan-option-card";

type Props = {
  userName?: string | null;
  selected: ScanTypeId[];
  onToggle: (id: ScanTypeId) => void;
  onScan: () => void;
  onOpenReviewer?: () => void;
  scanning: boolean;
  text: string;
  configured: boolean | null;
  compact?: boolean;
};

export function ScanOptionsPanel({
  userName,
  selected,
  onToggle,
  onScan,
  scanning,
  text,
  configured,
}: Props) {
  const chars = text.trim().length;
  const words = wordCount(text);
  const hasDetection = selected.some((id) => DETECTION_SCAN_TYPES.includes(id));
  const hasFeedback = selected.includes("writing_feedback");
  const hasPlagiarism = selected.includes("plagiarism");
  const detectionReady =
    hasDetection && chars >= SCAN_MIN_CHARS && configured !== false;
  const feedbackReady = hasFeedback && chars >= 50;
  const plagiarismReady = hasPlagiarism && chars >= PLAGIARISM_MIN_CHARS;
  const canCheck =
    !scanning && (detectionReady || feedbackReady || plagiarismReady);

  const greeting = userName?.trim()
    ? `Welcome back, ${userName.trim().split(/\s+/)[0]}.`
    : "Welcome back.";

  const handleToggle = (id: ScanTypeId) => {
    onToggle(id);
  };

  const handleCheck = () => {
    if (canCheck) onScan();
  };

  return (
    <aside className="flex h-full min-h-0 w-full flex-col bg-keepr">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-5 scrollbar-hide">
        <div>
          <p className="text-[15px] font-semibold text-keepr">{greeting}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--keepr-muted)]">
            Enter your text and select scan(s) to start.
          </p>
        </div>

        {configured === false ? (
          <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[12px] text-amber-100">
            Add <code className="text-amber-50">GPTZERO_API_KEY</code> to your{" "}
            <code className="text-amber-50">.env</code> for AI detection. Writing Feedback and
            Plagiarism use <code className="text-amber-50">OPENAI_API_KEY</code>
            {"; "}
            add <code className="text-amber-50">SERPER_API_KEY</code> for live source URLs.
          </p>
        ) : null}

        <div className="space-y-2">
          {SCAN_OPTIONS.map((option) => (
            <ScanOptionCard
              key={option.id}
              option={option}
              selected={selected.includes(option.id)}
              onToggle={handleToggle}
            />
          ))}
        </div>
      </div>

      <div className="shrink-0 space-y-2 border-t border-[color:var(--keepr-border)] px-4 py-4">
        <button
          type="button"
          onClick={handleCheck}
          disabled={!canCheck}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[15px] font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {scanning ? "Scanning…" : "Scan"}
          {!scanning ? <span aria-hidden>→</span> : null}
        </button>
        <p className="text-center text-[12px] text-[color:var(--keepr-faint)]">
          {selected.filter((id) => SCAN_OPTIONS.some((o) => o.id === id && o.runnable)).length ||
            0}{" "}
          scan • {words.toLocaleString()} words
          {hasDetection && chars < SCAN_MIN_CHARS
            ? ` • ${SCAN_MIN_CHARS - chars} more characters for AI detection`
            : ""}
        </p>
      </div>
    </aside>
  );
}

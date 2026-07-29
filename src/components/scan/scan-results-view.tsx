"use client";

import { useMemo, useState } from "react";
import type { ScanResultPayload, ScanSentence } from "@/lib/scan-types";
import { sentenceBand } from "@/lib/scan-highlight";

function classLabel(predictedClass: string): string {
  const c = predictedClass.toUpperCase();
  if (c.includes("HUMAN")) return "Human";
  if (c.includes("MIXED")) return "Mixed";
  if (c.includes("AI")) return "AI";
  return predictedClass;
}

function classPhrase(predictedClass: string): string {
  const c = predictedClass.toUpperCase();
  if (c.includes("HUMAN")) return "human-written";
  if (c.includes("MIXED")) return "a mix of AI and human";
  if (c.includes("AI")) return "AI-generated";
  return predictedClass.toLowerCase();
}

function confidenceAdverb(raw?: string): string {
  if (!raw) return "moderately";
  const c = raw.toLowerCase();
  if (c.includes("high")) return "highly";
  if (c.includes("medium") || c.includes("moderate")) return "moderately";
  if (c.includes("low")) return "somewhat";
  return "moderately";
}

function classProbKey(predictedClass: string): "human" | "mixed" | "ai" | null {
  const c = predictedClass.toUpperCase();
  if (c.includes("HUMAN")) return "human";
  if (c.includes("MIXED")) return "mixed";
  if (c.includes("AI")) return "ai";
  return null;
}

function pct(v: number | undefined): number {
  if (typeof v !== "number" || !Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(100, Math.round(v * 100)));
}

type SentenceRow = ScanSentence & {
  index: number;
  band: ReturnType<typeof sentenceBand>;
};

type Props = {
  result: ScanResultPayload;
  showSentences?: boolean;
  selectedIndex?: number | null;
  onSelectSentence?: (index: number) => void;
  onClear?: () => void;
};

const PREVIEW = 5;

/** GPTZero-style Advanced Scan analysis panel. */
export function ScanAnalysisPanel({
  result,
  showSentences = true,
  selectedIndex = null,
  onSelectSentence,
  onClear,
}: Props) {
  const [aiExpanded, setAiExpanded] = useState(false);
  const [humanExpanded, setHumanExpanded] = useState(false);

  const label = classLabel(result.predictedClass);
  const winningKey = classProbKey(result.predictedClass);
  const aiPct = pct(result.classProbabilities.ai);
  const mixedPct = pct(result.classProbabilities.mixed);
  const humanPct = pct(result.classProbabilities.human);

  const sentences = showSentences ? result.sentences : [];
  const rows: SentenceRow[] = useMemo(
    () =>
      sentences.map((s, index) => ({
        ...s,
        index,
        band: sentenceBand(s),
      })),
    [sentences]
  );

  const likelyAiCount = rows.filter(
    (r) => r.band === "likely" || r.band === "possible"
  ).length;

  const mostAi = useMemo(
    () => [...rows].sort((a, b) => b.generatedProb - a.generatedProb),
    [rows]
  );
  const mostHuman = useMemo(
    () => [...rows].sort((a, b) => a.generatedProb - b.generatedProb),
    [rows]
  );

  const aiVisible = aiExpanded ? mostAi : mostAi.slice(0, PREVIEW);
  const humanVisible = humanExpanded ? mostHuman : mostHuman.slice(0, PREVIEW);
  const aiMore = Math.max(0, mostAi.length - PREVIEW);
  const humanMore = Math.max(0, mostHuman.length - PREVIEW);

  return (
    <div className="space-y-7">
      {/* Summary */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-2">
          <h3 className="text-[15px] font-semibold tracking-tight text-keepr">
            Advanced Scan
          </h3>
          {onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-[12px] text-[color:var(--keepr-faint)] hover:text-keepr"
            >
              Clear
            </button>
          ) : null}
        </div>

        <div className="flex items-start gap-3.5">
          <ClassificationRing
            label={label}
            ai={aiPct}
            mixed={mixedPct}
            human={humanPct}
          />
          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] font-medium text-keepr">
                Keepr AI Detection
              </span>
              <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[10px] font-medium text-[color:var(--keepr-faint)]">
                GPTZero
              </span>
            </div>
            <p className="mt-2 text-[13px] leading-snug text-[color:var(--keepr-muted)]">
              We are{" "}
              <span className="font-semibold text-keepr">
                {confidenceAdverb(result.confidence)} confident
              </span>{" "}
              this text is{" "}
              <span className="font-semibold text-keepr">
                {classPhrase(result.predictedClass)}
              </span>
            </p>
          </div>
        </div>

        {rows.length > 0 ? (
          <p className="mt-4 text-[13px] text-[color:var(--keepr-muted)]">
            <span className="font-medium text-keepr">
              {likelyAiCount}/{rows.length}
            </span>{" "}
            Sentences likely AI generated
          </p>
        ) : null}

        <p className="mt-3 text-[12px] text-[color:var(--keepr-faint)]">
          Chance this entire text is…
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <ChancePill
            label="AI"
            value={aiPct}
            tone="ai"
            active={winningKey === "ai"}
          />
          <ChancePill
            label="Mixed"
            value={mixedPct}
            tone="mixed"
            active={winningKey === "mixed"}
          />
          <ChancePill
            label="Human"
            value={humanPct}
            tone="human"
            active={winningKey === "human"}
          />
        </div>
      </section>

      {/* Sentences impacting result */}
      {rows.length > 0 ? (
        <section className="space-y-5">
          <div>
            <h3 className="text-[14px] font-semibold tracking-tight text-keepr">
              Sentences Impacting the Result
            </h3>
            <ImpactSpectrum rows={rows} />
            <div className="mt-1.5 flex justify-between text-[11px] text-[color:var(--keepr-faint)]">
              <span>High AI Impact</span>
              <span>High Human Impact</span>
            </div>
          </div>

          <SentenceGroup
            title="Your most AI sentences"
            rows={aiVisible}
            kind="ai"
            selectedIndex={selectedIndex}
            onSelectSentence={onSelectSentence}
            moreCount={aiExpanded ? 0 : aiMore}
            onExpand={() => setAiExpanded(true)}
          />

          <SentenceGroup
            title="Your most human sentences"
            rows={humanVisible}
            kind="human"
            selectedIndex={selectedIndex}
            onSelectSentence={onSelectSentence}
            moreCount={humanExpanded ? 0 : humanMore}
            onExpand={() => setHumanExpanded(true)}
          />
        </section>
      ) : null}
    </div>
  );
}

function ClassificationRing({
  label,
  ai,
  mixed,
  human,
}: {
  label: string;
  ai: number;
  mixed: number;
  human: number;
}) {
  const size = 72;
  const stroke = 7;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const total = Math.max(1, ai + mixed + human);
  const segs = [
    { pct: ai / total, color: "#e8c547" },
    { pct: mixed / total, color: "#9ecb8a" },
    { pct: human / total, color: "#4f9d6e" },
  ];
  let offset = 0;

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={stroke}
        />
        {segs.map((seg, i) => {
          const len = seg.pct * c;
          const el = (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={seg.color}
              strokeWidth={stroke}
              strokeDasharray={`${len} ${c - len}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform={`rotate(-90 ${size / 2} ${size / 2})`}
            />
          );
          offset += len;
          return el;
        })}
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[12px] font-semibold text-keepr">
        {label}
      </span>
    </div>
  );
}

function ChancePill({
  label,
  value,
  tone,
  active,
}: {
  label: string;
  value: number;
  tone: "ai" | "mixed" | "human";
  active: boolean;
}) {
  const border =
    tone === "ai"
      ? "border-[#e8c547]/55 text-[#e8c547]"
      : tone === "mixed"
        ? "border-[#9ecb8a]/70 text-[#c5e0b4]"
        : "border-[#4f9d6e]/55 text-[#7dbe96]";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[12px] font-medium tabular-nums ${border} ${
        active ? "bg-white/[0.06]" : "opacity-80"
      }`}
    >
      {label} {value}%
    </span>
  );
}

function ImpactSpectrum({ rows }: { rows: SentenceRow[] }) {
  // Show up to 48 tiles: left = most AI, right = most human
  const sorted = useMemo(
    () => [...rows].sort((a, b) => b.generatedProb - a.generatedProb),
    [rows]
  );
  const tiles = sorted.slice(0, 48);
  if (!tiles.length) return null;

  return (
    <div className="mt-3 flex h-3.5 overflow-hidden rounded-md">
      {tiles.map((r) => {
        const p = r.generatedProb;
        const color =
          p >= 0.65
            ? "#d4a017"
            : p >= 0.5
              ? "#e8c547"
              : p >= 0.35
                ? "#b8d4a0"
                : "#5fa97a";
        return (
          <span
            key={r.index}
            className="min-w-0 flex-1"
            style={{ backgroundColor: color }}
            title={`${Math.round(p * 100)}% AI`}
          />
        );
      })}
    </div>
  );
}

function SentenceGroup({
  title,
  rows,
  kind,
  selectedIndex,
  onSelectSentence,
  moreCount,
  onExpand,
}: {
  title: string;
  rows: SentenceRow[];
  kind: "ai" | "human";
  selectedIndex?: number | null;
  onSelectSentence?: (index: number) => void;
  moreCount: number;
  onExpand: () => void;
}) {
  if (!rows.length) return null;

  return (
    <div>
      <h4 className="mb-2 text-[13px] font-medium text-keepr">{title}</h4>
      <ul className="space-y-1.5">
        {rows.map((r) => {
          const selected = selectedIndex === r.index;
          const filled =
            kind === "ai"
              ? r.generatedProb >= 0.75
                ? 3
                : r.generatedProb >= 0.55
                  ? 2
                  : 1
              : r.generatedProb <= 0.2
                ? 3
                : r.generatedProb <= 0.4
                  ? 2
                  : 1;
          return (
            <li key={r.index}>
              <button
                type="button"
                onClick={() => onSelectSentence?.(r.index)}
                className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition ${
                  selected
                    ? "bg-sky-500/15"
                    : "bg-white/[0.04] hover:bg-white/[0.07]"
                }`}
              >
                <DotMeter kind={kind} filled={filled} />
                <span className="min-w-0 flex-1 truncate text-[12px] leading-snug text-[color:var(--keepr-muted)]">
                  {r.text}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {moreCount > 0 ? (
        <button
          type="button"
          onClick={onExpand}
          className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] font-medium text-[color:var(--keepr-muted)] hover:bg-white/[0.1] hover:text-keepr"
        >
          Read {moreCount} more
          <span aria-hidden className="text-[10px]">
            ▾
          </span>
        </button>
      ) : null}
    </div>
  );
}

function DotMeter({ kind, filled }: { kind: "ai" | "human"; filled: number }) {
  const on = kind === "ai" ? "#e8c547" : "#7dbe96";
  return (
    <span className="flex shrink-0 items-center gap-0.5" aria-hidden>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-1.5 w-1.5 rounded-full"
          style={{
            backgroundColor: i < filled ? on : "transparent",
            boxShadow: `inset 0 0 0 1.25px ${on}`,
          }}
        />
      ))}
    </span>
  );
}

/** @deprecated Prefer ScanAnalysisPanel — kept for any leftover imports. */
export function ScanResultsView(props: {
  result: ScanResultPayload;
  showSentences?: boolean;
}) {
  return <ScanAnalysisPanel result={props.result} showSentences={props.showSentences} />;
}

"use client";

import type { PlagiarismResultPayload } from "@/lib/plagiarism-types";

type Props = {
  result: PlagiarismResultPayload;
  onClear?: () => void;
};

export function PlagiarismResultsView({ result, onClear }: Props) {
  const score = Math.round(result.score);

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]">
            Originality risk
          </p>
          <p className="mt-1 text-3xl font-semibold tabular-nums text-keepr">{score}%</p>
          <p className="mt-1 text-[13px] leading-relaxed text-[color:var(--keepr-muted)]">
            {result.summary}
          </p>
        </div>
        {onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="shrink-0 text-[12px] text-sky-400 hover:text-sky-300"
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all ${
            score >= 60 ? "bg-rose-400" : score >= 35 ? "bg-amber-400" : "bg-emerald-400"
          }`}
          style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
        />
      </div>

      {!result.webSearchEnabled ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-[12px] leading-relaxed text-amber-100">
          Live web matching is off. Add{" "}
          <code className="text-amber-50">SERPER_API_KEY</code> to your{" "}
          <code className="text-amber-50">.env</code> for source URLs. This report uses OpenAI
          originality-risk scoring only.
        </p>
      ) : (
        <p className="text-[12px] text-[color:var(--keepr-faint)]">
          Matches include live web search results.
        </p>
      )}

      {result.matches.length === 0 ? (
        <p className="text-[13px] text-[color:var(--keepr-muted)]">
          No flagged passages for this document.
        </p>
      ) : (
        <ul className="space-y-3">
          {result.matches.map((m, i) => (
            <li
              key={`${i}-${m.quote.slice(0, 24)}`}
              className="rounded-xl border border-white/10 bg-[color:var(--keepr-elevated)] px-3 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--keepr-faint)]">
                  Match {i + 1}
                </span>
                <span className="text-[12px] font-medium tabular-nums text-keepr">
                  {Math.round(m.score)}%
                </span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-keepr">&ldquo;{m.quote}&rdquo;</p>
              {m.title || m.url ? (
                <div className="mt-2">
                  {m.url ? (
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium text-sky-400 hover:text-sky-300"
                    >
                      {m.title || m.url}
                    </a>
                  ) : m.title ? (
                    <p className="text-[12px] text-[color:var(--keepr-muted)]">{m.title}</p>
                  ) : null}
                  {m.snippet ? (
                    <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--keepr-muted)]">
                      {m.snippet}
                    </p>
                  ) : null}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

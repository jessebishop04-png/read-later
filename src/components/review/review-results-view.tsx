"use client";

import type { ReviewResultPayload } from "@/lib/review-presets";

type Props = {
  result: ReviewResultPayload;
};

export function ReviewResultsView({ result }: Props) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-[color:var(--keepr-elevated)] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-white">Writing feedback</h3>
          {result.scoreLabel ? (
            <span className="rounded-full bg-violet-500/20 px-2.5 py-0.5 text-[11px] font-medium text-violet-200 ring-1 ring-violet-500/30">
              {result.scoreLabel}
            </span>
          ) : null}
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-[color:var(--keepr-muted)]">
          {result.summary}
        </p>
      </div>

      {result.strengths.length > 0 ? (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]">
            Strengths
          </h4>
          <ul className="space-y-1.5">
            {result.strengths.map((s, i) => (
              <li
                key={`s-${i}`}
                className="rounded-xl bg-emerald-500/10 px-3 py-2 text-[13px] text-emerald-50 ring-1 ring-emerald-500/20"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {result.improvements.length > 0 ? (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[color:var(--keepr-faint)]">
            Improvements
          </h4>
          <ul className="space-y-1.5">
            {result.improvements.map((s, i) => (
              <li
                key={`i-${i}`}
                className="rounded-xl bg-amber-500/10 px-3 py-2 text-[13px] text-amber-50 ring-1 ring-amber-500/20"
              >
                {s}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="rounded-2xl border border-sky-500/25 bg-sky-500/10 p-4">
        <h4 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-sky-200/80">
          Revision task
        </h4>
        <p className="mt-2 text-[13px] leading-relaxed text-sky-50">{result.revisionTask}</p>
      </div>
    </div>
  );
}

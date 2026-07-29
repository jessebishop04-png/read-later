"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  REVIEW_GRADE_LEVELS,
  REVIEW_TONES,
  type ReviewResultPayload,
} from "@/lib/review-presets";
import { storeReviewTemplateId } from "@/lib/review-template-default";

export type ReviewTemplateDto = {
  id: string;
  userId: string | null;
  name: string;
  category: string;
  description: string | null;
  instructions: string;
  tone: string | null;
  gradeLevel: string | null;
  isBuiltin: boolean;
};

type CategoryFilter = "all" | "professional" | "academic" | "exam" | "custom";

type Props = {
  open: boolean;
  onClose: () => void;
  text: string;
  itemId?: string | null;
  source?: "paste" | "item";
  onComplete: (result: ReviewResultPayload) => void;
};

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "professional", label: "Professional" },
  { id: "academic", label: "Academic" },
  { id: "exam", label: "Exam Types" },
  { id: "custom", label: "Your Templates" },
];

const SUGGESTIONS = [
  {
    label: "Student English papers",
    instructions:
      "Grade these persuasive essays as a Grade 8 teacher. Use grade-appropriate standards and student-friendly tone. Identify what’s working and what needs improvement. Give one clear revision task.",
    tone: "student-friendly",
    gradeLevel: "Grade 8",
  },
  {
    label: "Professional writing",
    instructions:
      "Review this professional writing for clarity, impact, and audience fit. Cut fluff. Suggest one high-impact revision.",
    tone: "professional",
    gradeLevel: "Professional",
  },
  {
    label: "Academic tone",
    instructions:
      "Review this academic writing for precision, evidence, structure, and tone. Flag vague claims. Give one concrete revision task.",
    tone: "formal",
    gradeLevel: "College",
  },
];

export function CustomReviewerModal({
  open,
  onClose,
  text,
  itemId,
  source = "paste",
  onComplete,
}: Props) {
  const [templates, setTemplates] = useState<ReviewTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [tone, setTone] = useState<string>("constructive");
  const [gradeLevel, setGradeLevel] = useState<string>("College");
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/review/templates", { credentials: "include" });
      const data = (await res.json()) as { templates?: ReviewTemplateDto[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load templates");
      setTemplates(data.templates || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load templates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadTemplates();
    setCreating(false);
    setSelectedId(null);
    setError(null);
    setQuery("");
    setCategory("all");
  }, [open, loadTemplates]);

  const counts = useMemo(() => {
    const c: Record<CategoryFilter, number> = {
      all: templates.length,
      professional: 0,
      academic: 0,
      exam: 0,
      custom: 0,
    };
    for (const t of templates) {
      if (t.isBuiltin && t.category in c) {
        c[t.category as CategoryFilter] += 1;
      } else if (!t.isBuiltin) {
        c.custom += 1;
      }
    }
    return c;
  }, [templates]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return templates.filter((t) => {
      if (category === "custom" && t.isBuiltin) return false;
      if (category !== "all" && category !== "custom" && t.category !== category) return false;
      if (category === "custom" && t.isBuiltin) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        (t.description || "").toLowerCase().includes(q) ||
        t.instructions.toLowerCase().includes(q)
      );
    });
  }, [templates, category, query]);

  const selectTemplate = (t: ReviewTemplateDto) => {
    setSelectedId(t.id);
    setCreating(false);
    setInstructions(t.instructions);
    setTone(t.tone || "constructive");
    setGradeLevel(t.gradeLevel || "College");
  };

  const startCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setInstructions(
      "Grade these persuasive essays as a Grade 8 teacher. Use grade-appropriate standards and student-friendly tone. Identify what’s working and what needs improvement. Give one clear revision task."
    );
    setTone("student-friendly");
    setGradeLevel("Grade 8");
  };

  const runReview = async () => {
    if (!instructions.trim()) {
      setError("Add instructions for your reviewer");
      return;
    }
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          itemId: itemId || undefined,
          source,
          templateId: selectedId || undefined,
          instructions,
          tone,
          gradeLevel,
          saveAsTemplate: creating && !selectedId,
          templateName: creating ? "Custom reviewer" : undefined,
        }),
      });
      const data = (await res.json()) as {
        error?: string;
        result?: ReviewResultPayload;
      };
      if (!res.ok) throw new Error(data.error || "Review failed");
      if (!data.result) throw new Error("No review result");
      if (selectedId) storeReviewTemplateId(selectedId);
      onComplete(data.result);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setRunning(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label="Close"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Custom Reviewer"
        className="relative flex h-[min(92dvh,720px)] w-full max-w-5xl overflow-hidden rounded-2xl border border-white/10 bg-keepr shadow-2xl"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg px-2 py-1 text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-white"
          aria-label="Close"
        >
          ✕
        </button>

        <aside className="flex w-[min(100%,17rem)] shrink-0 flex-col border-r border-white/10 bg-[color:var(--keepr-elevated)]/40">
          <div className="space-y-3 px-4 pb-3 pt-5">
            <h2 className="text-[15px] font-semibold leading-snug text-white">
              Choose an expert to get feedback
            </h2>
            <p className="text-[11px] text-[color:var(--keepr-faint)]">
              Don’t see the expert you need? Create your own below.
            </p>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full rounded-full border border-white/10 bg-black/20 px-3 py-2 text-[13px] text-white placeholder:text-[color:var(--keepr-faint)] outline-none focus:border-white/25"
            />
          </div>

          <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3 scrollbar-hide">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] ${
                  category === c.id
                    ? "bg-white/10 font-medium text-white"
                    : "text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-white"
                }`}
              >
                <span>{c.label}</span>
                <span className="text-[11px] text-[color:var(--keepr-faint)]">
                  {counts[c.id]}
                </span>
              </button>
            ))}

            <div className="mt-3 space-y-1 border-t border-white/5 pt-3">
              {loading ? (
                <p className="px-3 py-2 text-[12px] text-[color:var(--keepr-faint)]">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="px-3 py-2 text-[12px] text-[color:var(--keepr-faint)]">
                  No templates here yet.
                </p>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTemplate(t)}
                    className={`w-full rounded-lg px-3 py-2 text-left ${
                      selectedId === t.id
                        ? "bg-violet-500/20 text-white ring-1 ring-violet-400/30"
                        : "text-[color:var(--keepr-muted)] hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span className="block truncate text-[13px] font-medium">{t.name}</span>
                    {t.description ? (
                      <span className="mt-0.5 block truncate text-[11px] text-[color:var(--keepr-faint)]">
                        {t.description}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </nav>

          <div className="border-t border-white/10 p-3">
            <button
              type="button"
              onClick={startCreate}
              className="w-full rounded-xl bg-white/10 px-3 py-2.5 text-[13px] font-semibold text-white hover:bg-white/15"
            >
              + Create your own
            </button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5 scrollbar-hide sm:px-7">
            <div>
              <h3 className="text-lg font-semibold text-white">
                What should your Custom Reviewer focus on?
              </h3>
              <p className="mt-1 text-[13px] text-[color:var(--keepr-muted)]">
                Give instructions on how you’d like to review documents
              </p>
            </div>

            {error ? (
              <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-200">
                {error}
              </p>
            ) : null}

            <div className="rounded-2xl border border-white/10 bg-[color:var(--keepr-elevated)]">
              <textarea
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                rows={8}
                className="w-full resize-none bg-transparent px-4 pt-4 text-[14px] leading-relaxed text-white outline-none placeholder:text-[color:var(--keepr-faint)]"
                placeholder="Describe how the reviewer should evaluate this writing…"
              />
              <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-3 py-2.5">
                <span className="text-[12px] text-[color:var(--keepr-faint)]">
                  + Attach rubric or guidelines
                </span>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[12px] text-white outline-none"
                  aria-label="Tone"
                >
                  {REVIEW_TONES.map((t) => (
                    <option key={t} value={t}>
                      Tone: {t}
                    </option>
                  ))}
                </select>
                <select
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                  className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[12px] text-white outline-none"
                  aria-label="Grade level"
                >
                  {REVIEW_GRADE_LEVELS.map((g) => (
                    <option key={g} value={g}>
                      Grade level: {g}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => void runReview()}
                  disabled={running || !instructions.trim()}
                  className="ml-auto flex h-9 w-9 items-center justify-center rounded-full bg-white text-black disabled:opacity-40"
                  aria-label="Run review"
                  title="Run review"
                >
                  {running ? "…" : "→"}
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => {
                    setCreating(true);
                    setSelectedId(null);
                    setInstructions(s.instructions);
                    setTone(s.tone);
                    setGradeLevel(s.gradeLevel);
                  }}
                  className="rounded-full border border-white/10 px-3 py-1.5 text-[12px] text-[color:var(--keepr-muted)] hover:border-white/25 hover:text-white"
                >
                  {s.label}
                </button>
              ))}
            </div>

            <div className="rounded-2xl border border-white/5 bg-black/20 p-4">
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[color:var(--keepr-faint)]">
                What happens next?
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-4 text-[13px] text-[color:var(--keepr-muted)]">
                <li>View and adjust reviewer template.</li>
                <li>Review and score this document.</li>
                <li>Save custom templates under Review for reuse.</li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

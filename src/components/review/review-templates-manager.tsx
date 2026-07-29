"use client";

import { useCallback, useEffect, useState } from "react";
import type { ReviewTemplateDto } from "@/components/review/custom-reviewer-modal";
import { REVIEW_GRADE_LEVELS, REVIEW_TONES } from "@/lib/review-presets";

export function ReviewTemplatesManager() {
  const [templates, setTemplates] = useState<ReviewTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    name: "",
    instructions: "",
    tone: "constructive",
    gradeLevel: "College",
    description: "",
  });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/review/templates", { credentials: "include" });
      const data = (await res.json()) as { templates?: ReviewTemplateDto[]; error?: string };
      if (!res.ok) throw new Error(data.error || "Failed to load");
      setTemplates(data.templates || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const builtins = templates.filter((t) => t.isBuiltin);
  const mine = templates.filter((t) => !t.isBuiltin);

  const startCreate = () => {
    setEditingId("new");
    setDraft({
      name: "",
      instructions: "",
      tone: "constructive",
      gradeLevel: "College",
      description: "",
    });
  };

  const startEdit = (t: ReviewTemplateDto) => {
    if (t.isBuiltin) return;
    setEditingId(t.id);
    setDraft({
      name: t.name,
      instructions: t.instructions,
      tone: t.tone || "constructive",
      gradeLevel: t.gradeLevel || "College",
      description: t.description || "",
    });
  };

  const duplicate = (t: ReviewTemplateDto) => {
    setEditingId("new");
    setDraft({
      name: `${t.name} (copy)`,
      instructions: t.instructions,
      tone: t.tone || "constructive",
      gradeLevel: t.gradeLevel || "College",
      description: t.description || "",
    });
  };

  const save = async () => {
    if (!draft.name.trim() || !draft.instructions.trim()) {
      setError("Name and instructions are required");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (editingId === "new") {
        const res = await fetch("/api/review/templates", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            instructions: draft.instructions,
            tone: draft.tone,
            gradeLevel: draft.gradeLevel,
            description: draft.description,
            category: "custom",
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Save failed");
      } else if (editingId) {
        const res = await fetch(`/api/review/templates/${editingId}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: draft.name,
            instructions: draft.instructions,
            tone: draft.tone,
            gradeLevel: draft.gradeLevel,
            description: draft.description,
          }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || "Save failed");
      }
      setEditingId(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!window.confirm("Delete this template?")) return;
    const res = await fetch(`/api/review/templates/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error || "Delete failed");
      return;
    }
    await load();
  };

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Review</h1>
          <p className="mt-1 text-sm text-[color:var(--keepr-muted)]">
            Manage custom reviewer templates used in Advanced AI Scan → Writing Feedback
          </p>
        </div>
        <button
          type="button"
          onClick={startCreate}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black hover:bg-white/90"
        >
          + Create template
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {error}
        </p>
      ) : null}

      {editingId ? (
        <div className="mb-8 space-y-3 rounded-2xl border border-white/10 bg-[color:var(--keepr-elevated)] p-4">
          <h2 className="text-sm font-semibold text-white">
            {editingId === "new" ? "New template" : "Edit template"}
          </h2>
          <input
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
            placeholder="Template name"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />
          <input
            value={draft.description}
            onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
            placeholder="Short description (optional)"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />
          <textarea
            value={draft.instructions}
            onChange={(e) => setDraft((d) => ({ ...d, instructions: e.target.value }))}
            rows={6}
            placeholder="Reviewer instructions"
            className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-white outline-none"
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={draft.tone}
              onChange={(e) => setDraft((d) => ({ ...d, tone: e.target.value }))}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[12px] text-white"
            >
              {REVIEW_TONES.map((t) => (
                <option key={t} value={t}>
                  Tone: {t}
                </option>
              ))}
            </select>
            <select
              value={draft.gradeLevel}
              onChange={(e) => setDraft((d) => ({ ...d, gradeLevel: e.target.value }))}
              className="rounded-full border border-white/10 bg-black/20 px-3 py-1.5 text-[12px] text-white"
            >
              {REVIEW_GRADE_LEVELS.map((g) => (
                <option key={g} value={g}>
                  Grade: {g}
                </option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-xl px-4 py-2 text-sm text-[color:var(--keepr-muted)] hover:text-white"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-[color:var(--keepr-faint)]">Loading…</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--keepr-faint)]">
              Your templates
            </h2>
            {mine.length === 0 ? (
              <p className="text-sm text-[color:var(--keepr-muted)]">
                No custom templates yet. Create one or duplicate a preset.
              </p>
            ) : (
              <ul className="space-y-2">
                {mine.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-start justify-between gap-3 rounded-xl bg-[color:var(--keepr-elevated)] px-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-white">{t.name}</p>
                      <p className="mt-0.5 line-clamp-2 text-[12px] text-[color:var(--keepr-muted)]">
                        {t.description || t.instructions}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(t)}
                        className="text-[12px] text-sky-400 hover:text-sky-300"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(t.id)}
                        className="text-[12px] text-rose-400 hover:text-rose-300"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-[color:var(--keepr-faint)]">
              Built-in experts
            </h2>
            <ul className="space-y-2">
              {builtins.map((t) => (
                <li
                  key={t.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-[color:var(--keepr-elevated)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-white">{t.name}</p>
                    <p className="mt-0.5 text-[11px] uppercase tracking-wide text-[color:var(--keepr-faint)]">
                      {t.category}
                    </p>
                    <p className="mt-1 line-clamp-2 text-[12px] text-[color:var(--keepr-muted)]">
                      {t.description}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => duplicate(t)}
                    className="shrink-0 text-[12px] text-sky-400 hover:text-sky-300"
                  >
                    Duplicate
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}

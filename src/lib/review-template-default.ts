/** Client helpers for default Writing Feedback template on Scan. */

export const REVIEW_TEMPLATE_STORAGE_KEY = "keepr-review-template-id";

export type ReviewTemplatePick = {
  id: string;
  isBuiltin: boolean;
};

export function readStoredReviewTemplateId(): string | null {
  try {
    const id = localStorage.getItem(REVIEW_TEMPLATE_STORAGE_KEY)?.trim();
    return id || null;
  } catch {
    return null;
  }
}

export function storeReviewTemplateId(id: string): void {
  try {
    localStorage.setItem(REVIEW_TEMPLATE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

/** Prefer last-used template id; else first builtin; else first template. */
export function pickDefaultReviewTemplateId(
  templates: ReviewTemplatePick[]
): string | null {
  if (!templates.length) return null;
  const stored = readStoredReviewTemplateId();
  if (stored && templates.some((t) => t.id === stored)) return stored;
  const builtin = templates.find((t) => t.isBuiltin);
  return builtin?.id ?? templates[0]?.id ?? null;
}

export async function fetchDefaultReviewTemplateId(): Promise<string | null> {
  const res = await fetch("/api/review/templates", { credentials: "include" });
  const data = (await res.json()) as {
    templates?: ReviewTemplatePick[];
    error?: string;
  };
  if (!res.ok) throw new Error(data.error || "Failed to load review templates");
  return pickDefaultReviewTemplateId(data.templates || []);
}

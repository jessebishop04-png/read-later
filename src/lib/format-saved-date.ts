/** User-facing date for when an item was saved (local timezone). */
export function formatSavedDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Server-side word splitting for masked reveal animations.
 *
 * Returns HTML where each word of `text` is wrapped in an aria-hidden
 * span so the heading keeps one clean, unsplit accessible name (set by
 * the consumer via aria-label) while motion libraries can stagger the
 * words. Words stay visually represented without JavaScript — the
 * hiding only happens under `documentElement.js` + no reduced motion.
 */
export function splitWords(text: string): string {
  return text
    .split(" ")
    .filter(Boolean)
    .map((word) => `<span class="split-word" aria-hidden="true">${escapeHtml(word)}</span>`)
    .join(" ");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function padIndex(index: number): string {
  return String(index).padStart(2, "0");
}

/** Plain-text helpers for anything a person types that others will read. */

/**
 * Makes text safe and tidy to store: no HTML, no runaway whitespace, no
 * surprises in length. Shop owners paste from WhatsApp and notes apps, so
 * markup and odd spacing arrive whether or not anyone intends it.
 */
export function toPlainText(value, maxLength = 200) {
  return String(value ?? '')
    .replace(/<[^>]*>/g, ' ')   // drop tags
    .replace(/[\u0000-\u001f]+/g, ' ')  // control characters, including newlines
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

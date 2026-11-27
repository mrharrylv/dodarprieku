/**
 * Whether a key event's target is somewhere the visitor types: a text field,
 * a text area, a select or editable content. Escape there belongs to the
 * field (a search box clears itself on it), not to the panel around it.
 */
export const isTextEntry = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (!(target instanceof HTMLInputElement)) return false
  return !NOT_TEXT.has(target.type)
}

/** Input types that take no typing: Escape on them is the panel's. */
const NOT_TEXT: ReadonlySet<string> = new Set(['button', 'checkbox', 'color', 'file', 'hidden', 'image', 'radio', 'range', 'reset', 'submit'])

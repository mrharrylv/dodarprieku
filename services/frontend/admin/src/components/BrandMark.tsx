/**
 * The Dod ar prieku mark: a heart inside a map pin, the same drawing as the
 * website's logo and `public/favicon.svg`. Decorative: it always sits beside
 * the brand name. The pin takes the accent fill and the heart the label colour
 * on it, so it keeps its contrast in both themes.
 */
export const BrandMark = ({ className = 'size-8' }: { readonly className?: string }) => (
  <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false" className={`shrink-0 ${className}`}>
    <path className="fill-[var(--fill-accent)]" d="M32 4C19.3 4 9 14 9 26.6 9 43 32 60 32 60s23-17 23-33.4C55 14 44.7 4 32 4Z" />
    <path
      className="fill-[var(--text-on-accent)]"
      d="M32 37.5s-11-6.6-11-14.2a6 6 0 0 1 11-3.4 6 6 0 0 1 11 3.4c0 7.6-11 14.2-11 14.2Z"
    />
  </svg>
)

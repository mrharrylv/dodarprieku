type SectionHeadingProps = {
  title: string
  subtitle?: string
}

/**
 * Every section opens the same way: a heavy black rule, then the heading in
 * the display serif.
 *
 * That rule is what replaces the tinted bands other styles use to tell one
 * section from the next, so it has to be the strongest line on the page.
 * --border-strong rather than --border-subtle: tokens.css repoints it to full
 * ink for exactly this, because a section rule that is grey reads as an
 * accident.
 */
export const SectionHeading = ({ title, subtitle }: SectionHeadingProps) => (
  <div className="border-t-2 border-(--border-strong) pt-5">
    <h2 className="max-w-[20ch] break-words font-(family-name:--font-display) text-(length:--text-3xl) font-semibold leading-[1.05] tracking-[-0.03em] text-(--text-primary)">
      {title}
    </h2>
    {subtitle ? (
      <p className="mt-4 max-w-[52ch] text-(length:--text-lg) leading-relaxed text-(--text-secondary)">
        {subtitle}
      </p>
    ) : null}
  </div>
)

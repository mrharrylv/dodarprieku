/**
 * The top of an inner page: the one `h1`, its subtitle, and nothing else.
 *
 * Deliberately NOT split in two. The zig-zag starts under it, so the page
 * opens with a single full-width statement and the alternation reads as a
 * rhythm rather than as the page's default state.
 */
export const PageHead = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <div className="px-5 py-14 sm:px-8 sm:py-20 lg:px-12 lg:py-24">
    <h1 className="max-w-[18ch] text-balance break-words font-(family-name:--font-display) text-(length:--text-4xl) font-semibold leading-[1.05] tracking-tight text-(--text-primary)">
      {title}
    </h1>
    <p className="mt-6 max-w-xl text-(length:--text-lg) text-(--text-secondary)">
      {subtitle}
    </p>
  </div>
)

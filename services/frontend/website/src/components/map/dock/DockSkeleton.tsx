/**
 * The docked panel's quiet placeholder while its content loads: two soft
 * blocks, the words for a screen reader alone. Words appearing and then
 * swapping for the content would blink inside the panel's slide.
 */
export const DockSkeleton = ({ label }: { label: string }) => (
  <div role="status" className="space-y-4 py-2">
    <span className="sr-only">{label}</span>
    <div aria-hidden="true" className="h-6 w-2/3 animate-pulse rounded-(--radius-md) bg-(--surface-sunken)" />
    <div aria-hidden="true" className="h-24 animate-pulse rounded-(--radius-lg) bg-(--surface-sunken)" />
  </div>
)

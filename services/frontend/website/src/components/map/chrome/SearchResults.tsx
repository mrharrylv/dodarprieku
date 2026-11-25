import { useEffect, useRef, type ReactNode, type RefObject } from 'react'
import { useTranslation } from 'react-i18next'


/**
 * The search's results, under the field: the organisations that match, each
 * one a fly-to. Closes on Escape (focus back to the field) and on a press
 * anywhere outside `within`, the search's own row.
 */
export const SearchResults = ({
  within,
  onDismiss,
  children,
}: {
  within: RefObject<HTMLElement | null>
  onDismiss: (restoreFocus: boolean) => void
  children: ReactNode
}) => {
  const { t } = useTranslation('map')
  const dismiss = useRef(onDismiss)
  useEffect(() => {
    dismiss.current = onDismiss
  })

  useEffect(() => {
    const onPointer = (event: PointerEvent) => {
      if (event.target instanceof Node && within.current?.contains(event.target) !== true) dismiss.current(false)
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dismiss.current(true)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [within])

  return (
    <div
      role="region"
      aria-label={t('search.results')}
      className="absolute inset-x-0 top-full z-10 mt-2 max-h-[min(32rem,60vh)] overflow-y-auto overscroll-contain rounded-(--radius-xl) border border-(--border-subtle) bg-(--surface-raised)/95 p-3 shadow-(--shadow-lifted) backdrop-blur-md"
    >
      {children}
    </div>
  )
}

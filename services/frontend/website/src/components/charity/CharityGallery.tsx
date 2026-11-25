import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PublicCharity } from '@shared/contracts'
import { cn } from '@/lib/cn'
import { mediaUrl } from '@/lib/snapshot'
import { Lightbox, type LightboxPhoto } from '@/components/ui/Lightbox'
import { Photo } from '@/components/ui/Photo'
import { CategoryBadge } from '@/components/icons/CategoryBadge'

/** The charity's photos: the cover large, the rest as thumbnails; any opens the lightbox. */
export const CharityGallery = ({ charity }: { charity: PublicCharity }) => {
  const { t } = useTranslation('charity')
  const [open, setOpen] = useState<number | null>(null)
  const name = charity.profile.organization.name
  const photos: readonly LightboxPhoto[] = charity.profile.photos.flatMap((key, i) => {
    const src = mediaUrl(key)
    return src === undefined ? [] : [{ src, alt: t('gallery.alt', { name, current: i + 1 }) }]
  })

  if (photos.length === 0) {
    return (
      <div className="flex aspect-[16/10] items-center justify-center rounded-(--radius-2xl) bg-(--surface-sunken)">
        <CategoryBadge category={charity.profile.category} size="lg" className="h-20 w-20 text-(length:--text-4xl)" />
      </div>
    )
  }

  const [cover, ...rest] = photos
  return (
    <div className="space-y-3">
      {cover !== undefined && (
        <OpenButton label={t('gallery.open', { current: 1, total: photos.length })} onClick={() => setOpen(0)}>
          <Photo src={cover.src} alt={cover.alt} priority ratio="aspect-[16/10]" className="rounded-(--radius-2xl)" />
        </OpenButton>
      )}
      {rest.length > 0 && (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-5">
          {rest.map((photo, i) => (
            <li key={photo.src}>
              <OpenButton label={t('gallery.open', { current: i + 2, total: photos.length })} onClick={() => setOpen(i + 1)}>
                <Photo src={photo.src} alt={photo.alt} ratio="aspect-square" className="rounded-(--radius-lg)" />
              </OpenButton>
            </li>
          ))}
        </ul>
      )}
      {open !== null && <Lightbox title={t('gallery.title', { name })} photos={photos} start={open} onClose={() => setOpen(null)} />}
    </div>
  )
}

const OpenButton = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={cn(
      'block w-full overflow-hidden rounded-(--radius-2xl) transition-[transform,box-shadow] duration-200',
      'hover:shadow-(--shadow-card) focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-(--ring-accent)',
    )}
  >
    {children}
  </button>
)

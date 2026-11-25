import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { LIMITS } from '@shared/contracts'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import { DropZone } from './DropZone'
import { PendingFile, type PendingItem } from './PendingFile'
import { addPhoto, makeCover, mediaUrl, removePhoto, slotsLeft } from './photo-list'
import { uploadErrorKey, uploadFile } from './upload-file'

const SMALL_BUTTON = cn(
  'min-h-11 rounded-(--radius-md) px-3 text-(length:--text-sm) font-medium',
  'bg-(--surface-raised)/95 text-(--text-primary) shadow-(--shadow-subtle)',
  'hover:text-(--text-accent)',
)

/**
 * Up to `LIMITS.maxPhotos` photos: pick or drop, each resized and uploaded on
 * its own with its own progress and error, a preview of what is uploaded,
 * remove, and "make cover" to move a photo to the front.
 */
export const PhotoUploader = ({
  photos,
  onChange,
}: {
  photos: readonly string[]
  onChange: (fn: (photos: readonly string[]) => readonly string[]) => void
}) => {
  const { t } = useTranslation('register')
  const [pending, setPending] = useState<readonly PendingItem[]>([])
  const nextId = useRef(0)
  const working = pending.filter((p) => p.status !== 'error').length
  const left = slotsLeft(photos, working)

  const patchItem = (id: number, patch: Partial<PendingItem>) =>
    setPending((items) => items.map((item) => (item.id === id ? { ...item, ...patch } : item)))

  const start = (files: readonly File[]) => {
    files.slice(0, left).forEach((file) => {
      const id = nextId.current++
      setPending((items) => [...items, { id, name: file.name, status: 'resizing', previewUrl: previewOf(file) }])
      void uploadFile(file, 'photo', (status) => patchItem(id, { status })).then((outcome) => {
        if (outcome.ok) {
          onChange((current) => addPhoto(current, outcome.key))
          setPending((items) => dropItem(items, id))
        } else {
          patchItem(id, { status: 'error', errorKey: uploadErrorKey(outcome.error) })
        }
      })
    })
  }

  // Previews are object URLs: freed when their row goes, and all of them on unmount.
  const pendingRef = useRef(pending)
  useEffect(() => {
    pendingRef.current = pending
  }, [pending])
  useEffect(() => () => pendingRef.current.forEach((p) => revoke(p.previewUrl)), [])

  return (
    <div className="space-y-4">
      {photos.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((key, index) => (
            <li key={key} className="relative overflow-hidden rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-sunken)">
              <img src={mediaUrl(key)} alt={t('upload.photoAlt', { n: index + 1 })} className="aspect-[4/3] w-full object-cover" />
              {index === 0 && (
                <span className="absolute top-2 left-2 inline-flex items-center gap-1 rounded-full bg-(--fill-accent) px-2.5 py-1 text-(length:--text-xs) font-medium text-(--text-on-accent)">
                  <Icon name="check" className="h-4 w-4" />
                  {t('upload.cover')}
                </span>
              )}
              <div className="absolute inset-x-2 bottom-2 flex flex-wrap justify-end gap-2">
                {index > 0 && (
                  <button type="button" className={SMALL_BUTTON} onClick={() => onChange((c) => makeCover(c, key))}
                    aria-label={t('upload.makeCoverN', { n: index + 1 })}>
                    {t('upload.makeCover')}
                  </button>
                )}
                <button type="button" className={SMALL_BUTTON} onClick={() => onChange((c) => removePhoto(c, key))}
                  aria-label={t('upload.removeN', { n: index + 1 })}>
                  {t('upload.remove')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {pending.length > 0 && (
        <ul className="space-y-2" aria-live="polite">
          {pending.map((item) => (
            <PendingFile key={item.id} item={item} onDismiss={() => setPending((items) => dropItem(items, item.id))} />
          ))}
        </ul>
      )}

      {left > 0 ? (
        <DropZone multiple label={t('upload.dropzone')} buttonLabel={t('upload.pick')}
          hint={t('upload.photosLeft', { count: left, max: LIMITS.maxPhotos })} onFiles={start} />
      ) : (
        <p className="text-(length:--text-sm) text-(--text-secondary)">{t('upload.full', { max: LIMITS.maxPhotos })}</p>
      )}
    </div>
  )
}

const dropItem = (items: readonly PendingItem[], id: number): readonly PendingItem[] => {
  items.filter((i) => i.id === id).forEach((i) => revoke(i.previewUrl))
  return items.filter((i) => i.id !== id)
}

const previewOf = (file: File): string | undefined => {
  try {
    return typeof URL.createObjectURL === 'function' ? URL.createObjectURL(file) : undefined
  } catch {
    return undefined
  }
}

const revoke = (url: string | undefined) => {
  if (url !== undefined && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url)
}

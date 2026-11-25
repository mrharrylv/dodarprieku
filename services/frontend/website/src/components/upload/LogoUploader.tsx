import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/lib/cn'
import { DropZone } from './DropZone'
import { PendingFile, type PendingItem } from './PendingFile'
import { mediaUrl } from './photo-list'
import { uploadErrorKey, uploadFile } from './upload-file'

/**
 * One logo (an organisation's, or a sponsor's): a preview with replace and
 * remove, or a drop zone. `value` is a media key, '' for none.
 */
export const LogoUploader = ({
  value,
  onChange,
  alt,
  compact = false,
}: {
  value: string
  onChange: (key: string) => void
  alt: string
  compact?: boolean
}) => {
  const { t } = useTranslation('register')
  const [pending, setPending] = useState<PendingItem | null>(null)

  const start = (files: readonly File[]) => {
    const file = files[0]
    if (!file) return
    setPending({ id: 0, name: file.name, status: 'resizing' })
    void uploadFile(file, 'logo', (status) => setPending((p) => (p ? { ...p, status } : p))).then((outcome) => {
      if (outcome.ok) {
        onChange(outcome.key)
        setPending(null)
      } else {
        setPending({ id: 0, name: file.name, status: 'error', errorKey: uploadErrorKey(outcome.error) })
      }
    })
  }

  const busy = pending !== null && pending.status !== 'error'

  return (
    <div className="space-y-3">
      {value !== '' && (
        <div className="flex flex-wrap items-center gap-4">
          <img
            src={mediaUrl(value)}
            alt={alt}
            className={cn('rounded-(--radius-md) border border-(--border-subtle) bg-(--surface-raised) object-contain p-1', compact ? 'h-14 w-14' : 'h-24 w-24')}
          />
          <button
            type="button"
            onClick={() => onChange('')}
            className="min-h-11 rounded-(--radius-md) border border-(--border-strong) px-4 font-medium text-(--text-primary) hover:text-(--text-accent)"
          >
            {t('upload.removeLogo')}
          </button>
        </div>
      )}
      {pending !== null && (
        <ul>
          <PendingFile item={pending} onDismiss={() => setPending(null)} />
        </ul>
      )}
      {value === '' && (
        <DropZone multiple={false} disabled={busy} label={t('upload.dropzoneLogo')} buttonLabel={t('upload.pickLogo')} onFiles={start} />
      )}
    </div>
  )
}

import { useTranslation } from 'react-i18next'

import { LIMITS } from '@shared/contracts'

import { Icon } from '@/components/ui/Icon'
import { cn } from '@/lib/cn'
import type { UploadStage } from './upload-file'

export interface PendingItem {
  readonly id: number
  readonly name: string
  readonly status: UploadStage | 'error'
  readonly previewUrl?: string | undefined
  readonly errorKey?: string
}

/** How far along a file is: resizing is the first half, the upload the second. */
const PROGRESS: Record<UploadStage, number> = { resizing: 35, uploading: 75 }

/** One file on its way up, or one that failed, with its own message. */
export const PendingFile = ({ item, onDismiss }: { item: PendingItem; onDismiss: () => void }) => {
  const { t } = useTranslation('register')
  const failed = item.status === 'error'

  return (
    <li
      className={cn(
        'flex items-center gap-3 rounded-(--radius-md) border p-2',
        failed ? 'border-(--color-danger-500)/50 bg-(--color-danger-500)/10' : 'border-(--border-subtle) bg-(--surface-raised)',
      )}
    >
      {item.previewUrl !== undefined ? (
        <img src={item.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-(--radius-sm) object-cover" />
      ) : (
        <span aria-hidden="true" className="h-12 w-12 shrink-0 rounded-(--radius-sm) bg-(--surface-sunken)" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-(length:--text-sm) font-medium text-(--text-primary)">{item.name}</p>
        {failed ? (
          <p role="alert" className="text-(length:--text-sm) text-(--color-danger-600)">
            {t(item.errorKey ?? 'upload.errors.generic', { max: LIMITS.uploadMaxBytes / 1_000_000 })}
          </p>
        ) : (
          <>
            <progress
              className="mt-1 h-2 w-full overflow-hidden rounded-full accent-(--fill-accent)"
              max={100}
              value={PROGRESS[item.status]}
              aria-label={t(`upload.stage.${item.status}`, { name: item.name })}
            />
            <p className="text-(length:--text-xs) text-(--text-muted)">{t(`upload.stage.${item.status}`, { name: item.name })}</p>
          </>
        )}
      </div>
      {failed && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={t('upload.dismiss', { name: item.name })}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-(--radius-md) text-(--text-secondary) hover:bg-(--surface-sunken)"
        >
          <Icon name="close" />
        </button>
      )}
    </li>
  )
}

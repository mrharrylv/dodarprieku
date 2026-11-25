import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { lv } from '../i18n/lv'
import { IconClose } from '../components/Icon'

export type ToastTone = 'success' | 'error' | 'info'
interface Toast {
  readonly id: number
  readonly tone: ToastTone
  readonly text: string
}

interface ToastApi {
  readonly show: (text: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastApi | undefined>(undefined)

export const TOAST_MS = 6000

const TONE: Record<ToastTone, string> = {
  success: 'border-[var(--border-success)] bg-[var(--surface-success-soft)] text-[var(--text-success)]',
  error: 'border-[var(--border-danger)] bg-[var(--surface-danger-soft)] text-[var(--text-danger)]',
  info: 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)]',
}

let nextId = 1

export const ToastProvider = ({ children }: { readonly children: ReactNode }) => {
  const [toasts, setToasts] = useState<readonly Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((list) => list.filter((t) => t.id !== id)), [])
  const show = useCallback(
    (text: string, tone: ToastTone = 'success') => {
      const id = nextId++
      setToasts((list) => [...list, { id, tone, text }])
      window.setTimeout(() => dismiss(id), TOAST_MS)
    },
    [dismiss],
  )
  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 bottom-4 z-50 flex flex-col items-end gap-2" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={`pointer-events-auto flex max-w-md items-start gap-3 rounded-[var(--radius-md)] border px-4 py-3 text-sm font-medium shadow-[var(--shadow-lifted)] ${TONE[t.tone]}`}
          >
            <span className="flex-1 py-1">{t.text}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="-m-1 inline-flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-sm)]"
              aria-label={lv.app.close}
            >
              <IconClose />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastApi => {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast outside ToastProvider')
  return ctx
}

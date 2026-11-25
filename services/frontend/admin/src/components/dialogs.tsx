/** Confirm, reason and typed-name dialogs over Dialog. Each runs an async action and shows its error. */
import { useState, type FormEvent } from 'react'
import { LIMITS } from '@shared/contracts'
import { fmt, lv } from '../i18n/lv'
import { errorMessage } from '../lib/errors'
import { Dialog } from './Dialog'
import { Button, Field, inputClass, type ButtonVariant } from './ui'

const useRunner = (action: () => Promise<void>) => {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const run = async () => {
    setBusy(true)
    setError(undefined)
    try {
      await action()
    } catch (e) {
      setError(errorMessage(e))
      setBusy(false)
    }
  }
  return { busy, error, run }
}

const ActionError = ({ text }: { readonly text: string | undefined }) =>
  text ? (
    <p role="alert" className="rounded-[var(--radius-md)] bg-[var(--surface-danger-soft)] p-3 text-sm font-medium text-[var(--text-danger)]">
      {text}
    </p>
  ) : null

interface ConfirmProps {
  readonly title: string
  readonly body: string
  readonly confirmLabel: string
  readonly variant?: ButtonVariant
  readonly onConfirm: () => Promise<void>
  readonly onClose: () => void
}

export const ConfirmDialog = ({ title, body, confirmLabel, variant = 'primary', onConfirm, onClose }: ConfirmProps) => {
  const { busy, error, run } = useRunner(onConfirm)
  return (
    <Dialog
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{lv.app.cancel}</Button>
          <Button variant={variant} onClick={() => void run()} disabled={busy} data-autofocus>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p>{body}</p>
      <ActionError text={error} />
    </Dialog>
  )
}

interface ReasonProps extends Omit<ConfirmProps, 'onConfirm'> {
  readonly required?: boolean
  readonly onConfirm: (reason: string) => Promise<void>
}

export const ReasonDialog = ({ title, body, confirmLabel, variant = 'danger', required = true, onConfirm, onClose }: ReasonProps) => {
  const [reason, setReason] = useState('')
  const [missing, setMissing] = useState(false)
  const { busy, error, run } = useRunner(() => onConfirm(reason.trim()))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (required && reason.trim() === '') {
      setMissing(true)
      return
    }
    void run()
  }
  return (
    <Dialog title={title} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <p>{body}</p>
        <Field
          label={lv.dialog.reason}
          hint={fmt(lv.dialog.reasonHint, { n: LIMITS.rejectReason })}
          error={missing ? lv.dialog.reasonRequired : undefined}
        >
          {(p) => (
            <textarea
              {...p}
              data-autofocus
              rows={4}
              maxLength={LIMITS.rejectReason}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value)
                setMissing(false)
              }}
              className={inputClass}
            />
          )}
        </Field>
        <ActionError text={error} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>{lv.app.cancel}</Button>
          <Button type="submit" variant={variant} disabled={busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

interface TypedProps extends ConfirmProps {
  readonly expected: string
}

export const TypedConfirmDialog = ({ title, body, confirmLabel, expected, onConfirm, onClose }: TypedProps) => {
  const [typed, setTyped] = useState('')
  const matches = typed.trim() === expected.trim()
  const { busy, error, run } = useRunner(onConfirm)
  return (
    <Dialog title={title} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          if (matches) void run()
        }}
      >
        <p>{body}</p>
        <Field label={fmt(lv.detail.deleteType, { name: expected })} error={typed !== '' && !matches ? lv.dialog.typedMismatch : undefined}>
          {(p) => (
            <input {...p} data-autofocus autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} className={inputClass} />
          )}
        </Field>
        <ActionError text={error} />
        <div className="flex flex-wrap justify-end gap-2">
          <Button onClick={onClose}>{lv.app.cancel}</Button>
          <Button type="submit" variant="danger" disabled={!matches || busy}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}

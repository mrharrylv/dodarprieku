import type { AdminCharityDetail } from '@shared/contracts'
import { ConfirmDialog, ReasonDialog, TypedConfirmDialog } from '../components/dialogs'
import { Button } from '../components/ui'
import { useApi } from '../context/api'
import { useCounts } from '../context/counts'
import { useToast } from '../context/toast'
import { fmt, lv } from '../i18n/lv'

export type ActionKind = 'suspend' | 'restore' | 'delete' | 'resend' | undefined

interface Props {
  readonly charity: AdminCharityDetail
  readonly open: ActionKind
  readonly setOpen: (kind: ActionKind) => void
  readonly onChanged: (detail: AdminCharityDetail) => void
  readonly onDeleted: () => void
}

export const CharityActions = ({ charity: c, open, setOpen, onChanged, onDeleted }: Props) => {
  const api = useApi()
  const toast = useToast()
  const { refresh } = useCounts()
  const close = () => setOpen(undefined)
  const changed = (detail: AdminCharityDetail, message: string) => {
    toast.show(message)
    refresh()
    close()
    onChanged(detail)
  }

  return (
    <>
      {c.status === 'approved' && <Button onClick={() => setOpen('suspend')}>{lv.detail.suspend}</Button>}
      {c.status === 'suspended' && <Button variant="primary" onClick={() => setOpen('restore')}>{lv.detail.restore}</Button>}
      {(c.status === 'approved' || c.status === 'suspended') && <Button onClick={() => setOpen('resend')}>{lv.detail.resend}</Button>}
      <Button variant="danger" onClick={() => setOpen('delete')}>{lv.detail.delete}</Button>

      {open === 'suspend' && (
        <ReasonDialog
          title={lv.detail.suspendTitle}
          body={lv.detail.suspendBody}
          confirmLabel={lv.detail.suspend}
          onConfirm={async (reason) => changed(await api.suspend(c.id, reason), lv.detail.suspended)}
          onClose={close}
        />
      )}
      {open === 'restore' && (
        <ConfirmDialog
          title={lv.detail.restoreTitle}
          body={lv.detail.restoreBody}
          confirmLabel={lv.detail.restore}
          onConfirm={async () => changed(await api.restore(c.id), lv.detail.restored)}
          onClose={close}
        />
      )}
      {open === 'resend' && (
        <ConfirmDialog
          title={lv.detail.resendTitle}
          body={fmt(lv.detail.resendBody, { email: c.accountEmail })}
          confirmLabel={lv.detail.resend}
          onConfirm={async () => {
            const result = await api.resendInvite(c.id)
            if (result.mailSent === false) toast.show(lv.detail.resendFailed, 'error')
            else toast.show(lv.detail.resent)
            close()
          }}
          onClose={close}
        />
      )}
      {open === 'delete' && (
        <TypedConfirmDialog
          title={lv.detail.deleteTitle}
          body={lv.detail.deleteBody}
          confirmLabel={lv.detail.delete}
          expected={c.name}
          onConfirm={async () => {
            await api.remove(c.id)
            toast.show(lv.detail.deleted)
            refresh()
            onDeleted()
          }}
          onClose={close}
        />
      )}
    </>
  )
}

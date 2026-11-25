import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminCharityDetail } from '@shared/contracts'
import { ConfirmDialog, ReasonDialog } from '../components/dialogs'
import { Loaded } from '../components/Loaded'
import { ProfileDiffView } from '../components/ProfileDiffView'
import { Button, EmptyState, PageHeader } from '../components/ui'
import { useApi } from '../context/api'
import { useCounts } from '../context/counts'
import { useToast } from '../context/toast'
import { useResource } from '../hooks/useResource'
import { lv } from '../i18n/lv'
import { formatDateTime } from '../lib/format'
import { PATHS, charityPath } from '../paths'

export const UpdateDetailPage = () => {
  const { id = '' } = useParams()
  const api = useApi()
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useCounts()
  const [open, setOpen] = useState<'approve' | 'reject'>()
  const { resource, reload } = useResource(() => api.charity(id), id)

  const finish = (message: string) => {
    toast.show(message)
    refresh()
    navigate(PATHS.updates)
  }
  const approve = async () => {
    await api.approveUpdate(id)
    finish(lv.updates.approved)
  }
  const reject = async (reason: string) => {
    await api.rejectUpdate(id, reason)
    finish(lv.updates.rejected)
  }

  return (
    <>
      <Link to={PATHS.updates} className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-[var(--text-accent)] underline">
        {lv.app.back}
      </Link>
      <Loaded resource={resource} onRetry={reload} rows={6}>
        {(c: AdminCharityDetail) =>
          !c.pendingUpdate ? (
            <>
              <PageHeader title={c.name} />
              <EmptyState text={lv.updates.none} />
            </>
          ) : (
            <>
              <PageHeader
                title={c.name}
                intro={`${lv.applications.submitted} ${formatDateTime(c.pendingUpdate.submittedAt)}`}
                actions={
                  <>
                    <Button variant="primary" onClick={() => setOpen('approve')}>{lv.updates.approve}</Button>
                    <Button variant="danger" onClick={() => setOpen('reject')}>{lv.updates.reject}</Button>
                    <Button onClick={() => navigate(charityPath(c.id))}>{lv.detail.profile}</Button>
                  </>
                }
              />
              <ProfileDiffView live={c.profile} proposed={c.pendingUpdate.profile} />
              {open === 'approve' && (
                <ConfirmDialog
                  title={lv.updates.approveTitle}
                  body={lv.updates.approveBody}
                  confirmLabel={lv.updates.approve}
                  onConfirm={approve}
                  onClose={() => setOpen(undefined)}
                />
              )}
              {open === 'reject' && (
                <ReasonDialog
                  title={lv.updates.rejectTitle}
                  body={lv.updates.rejectBody}
                  confirmLabel={lv.updates.reject}
                  onConfirm={reject}
                  onClose={() => setOpen(undefined)}
                />
              )}
            </>
          )
        }
      </Loaded>
    </>
  )
}

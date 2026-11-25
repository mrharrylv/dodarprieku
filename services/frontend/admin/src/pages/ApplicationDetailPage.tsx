import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminCharityDetail } from '@shared/contracts'
import { ConfirmDialog, ReasonDialog } from '../components/dialogs'
import { Loaded } from '../components/Loaded'
import { ProfileView } from '../components/ProfileView'
import { Button, PageHeader, StatusBadge } from '../components/ui'
import { useApi } from '../context/api'
import { useCounts } from '../context/counts'
import { useToast } from '../context/toast'
import { useResource } from '../hooks/useResource'
import { fmt, lv } from '../i18n/lv'
import { formatDateTime } from '../lib/format'
import { PATHS, charityPath } from '../paths'

type Open = 'approve' | 'reject' | undefined

export const ApplicationDetailPage = () => {
  const { id = '' } = useParams()
  const api = useApi()
  const navigate = useNavigate()
  const toast = useToast()
  const { refresh } = useCounts()
  const [open, setOpen] = useState<Open>()
  const { resource, reload } = useResource(() => api.charity(id), id)

  const done = () => {
    refresh()
    navigate(PATHS.applications)
  }

  const approve = async () => {
    const result = await api.approve(id)
    toast.show(lv.applications.approved)
    if (result.mailSent === true) toast.show(lv.applications.mailSent)
    if (result.mailSent === false) toast.show(lv.applications.mailNotSent, 'error')
    done()
  }

  const reject = async (reason: string) => {
    await api.reject(id, reason)
    toast.show(lv.applications.rejected)
    done()
  }

  return (
    <>
      <Link to={PATHS.applications} className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-[var(--text-accent)] underline">
        {lv.app.back}
      </Link>
      <Loaded resource={resource} onRetry={reload} rows={6}>
        {(c: AdminCharityDetail) => (
          <>
            <PageHeader
              title={c.name}
              intro={`${lv.applications.submitted} ${formatDateTime(c.createdAt)} · ${c.accountEmail}`}
              actions={
                c.status === 'pending' ? (
                  <>
                    <Button variant="primary" onClick={() => setOpen('approve')}>{lv.applications.approve}</Button>
                    <Button variant="danger" onClick={() => setOpen('reject')}>{lv.applications.reject}</Button>
                    <Button onClick={() => navigate(charityPath(c.id, true))}>{lv.applications.edit}</Button>
                  </>
                ) : undefined
              }
            />
            <div className="mb-4 flex items-center gap-3">
              <StatusBadge status={c.status} />
              {c.status !== 'pending' && <p className="text-sm text-[var(--text-secondary)]">{lv.applications.notPending}</p>}
            </div>
            <ProfileView profile={c.profile} />
            {open === 'approve' && (
              <ConfirmDialog
                title={lv.applications.approveTitle}
                body={fmt(lv.applications.approveBody, { name: c.name, email: c.accountEmail })}
                confirmLabel={lv.applications.approve}
                onConfirm={approve}
                onClose={() => setOpen(undefined)}
              />
            )}
            {open === 'reject' && (
              <ReasonDialog
                title={lv.applications.rejectTitle}
                body={lv.applications.rejectBody}
                confirmLabel={lv.applications.reject}
                onConfirm={reject}
                onClose={() => setOpen(undefined)}
              />
            )}
          </>
        )}
      </Loaded>
    </>
  )
}

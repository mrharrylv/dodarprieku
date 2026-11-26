import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import type { AdminCharityDetail, CharityProfile } from '@shared/contracts'
import { ConfirmDialog, ReasonDialog } from '../components/dialogs'
import { Loaded } from '../components/Loaded'
import { ProfileDiffView } from '../components/ProfileDiffView'
import { ProfileView } from '../components/ProfileView'
import { Button, PageHeader, StatusBadge } from '../components/ui'
import { useApi } from '../context/api'
import { useCounts } from '../context/counts'
import { useToast } from '../context/toast'
import { useResource } from '../hooks/useResource'
import { fmt, lv } from '../i18n/lv'
import { checkClaim, type ClaimCheck } from '../lib/claim-check'
import { formatDateTime } from '../lib/format'
import { PATHS, charityPath } from '../paths'

type Open = 'approve' | 'reject' | undefined

const checkText = (check: ClaimCheck, email: string): string => {
  if (check.kind === 'match') return fmt(lv.applications.claimCheckMatch, { email, via: check.via })
  if (check.kind === 'mismatch') return fmt(lv.applications.claimCheckMismatch, { email, domain: check.claimant })
  return fmt(lv.applications.claimCheckNoContacts, { email })
}

/** Whether the claimant's email fits the imported charity's public contacts, and what the admin must still do. */
const ClaimOwnership = ({ email, imported }: { email: string; imported: CharityProfile }) => {
  const check = checkClaim(email, imported)
  const warn = check.kind !== 'match'
  return (
    <div
      role={warn ? 'alert' : 'status'}
      className={`rounded-[var(--radius-md)] border p-4 text-sm ${
        warn
          ? 'border-[var(--border-danger)] bg-[var(--surface-danger-soft)] text-[var(--text-primary)]'
          : 'border-[var(--border-strong)] bg-[var(--surface-raised)] text-[var(--text-primary)]'
      }`}
    >
      <h3 className="font-semibold">{lv.applications.claimCheckTitle}</h3>
      <p className="mt-1">{checkText(check, email)}</p>
      <p className="mt-1 text-[var(--text-secondary)]">{lv.applications.claimCheckDuty}</p>
    </div>
  )
}

/** A claim: which imported charity it asks for, and how the submitted profile differs from it. */
const ClaimSection = ({
  claim,
  email,
  imported,
  submitted,
}: {
  claim: NonNullable<AdminCharityDetail['claim']>
  email: string
  imported: CharityProfile | undefined
  submitted: CharityProfile
}) => (
  <section aria-labelledby="claim-title" className="mb-6 space-y-4 rounded-[var(--radius-lg)] border border-[var(--border-strong)] bg-[var(--surface-accent-soft)] p-5">
    <div>
      <h2 id="claim-title" className="text-lg font-semibold text-[var(--text-primary)]">
        {fmt(lv.applications.claim, { name: claim.name })}
      </h2>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{lv.applications.claimIntro}</p>
      <Link to={charityPath(claim.charityId)} className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-[var(--text-accent)] underline">
        {lv.applications.claimOpen}
      </Link>
    </div>
    {imported && <ClaimOwnership email={email} imported={imported} />}
    {imported && (
      <div className="rounded-[var(--radius-md)] bg-[var(--surface-raised)] p-4">
        <h3 className="mb-3 font-semibold">{lv.applications.claimDiff}</h3>
        <ProfileDiffView
          live={imported}
          proposed={submitted}
          labels={{ before: lv.applications.claimBefore, after: lv.applications.claimAfter }}
        />
      </div>
    )}
  </section>
)

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

  const approve = async (isClaim: boolean) => {
    const result = await api.approve(id)
    toast.show(isClaim ? lv.applications.claimApproved : lv.applications.approved)
    if (result.mailSent === true) toast.show(lv.applications.mailSent)
    if (result.mailSent === false) toast.show(lv.applications.mailNotSent, 'error')
    if (!isClaim) return done()
    // The claim record is gone: the merged charity lives on under the imported id.
    refresh()
    navigate(charityPath(result.id))
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
            {c.claim && <ClaimSection claim={c.claim} email={c.accountEmail} imported={c.claimProfile} submitted={c.profile} />}
            <ProfileView profile={c.profile} />
            {open === 'approve' && (
              <ConfirmDialog
                title={lv.applications.approveTitle}
                body={fmt(c.claim ? lv.applications.claimApproveBody : lv.applications.approveBody, {
                  name: c.claim?.name ?? c.name,
                  email: c.accountEmail,
                })}
                confirmLabel={lv.applications.approve}
                onConfirm={() => approve(c.claim !== undefined)}
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

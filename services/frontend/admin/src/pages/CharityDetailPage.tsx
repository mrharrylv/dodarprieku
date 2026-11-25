import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import type { AdminCharityDetail } from '@shared/contracts'
import { Loaded } from '../components/Loaded'
import { ProfileView } from '../components/ProfileView'
import { PageHeader, StatusBadge } from '../components/ui'
import { useApi } from '../context/api'
import { useResource } from '../hooks/useResource'
import { lv } from '../i18n/lv'
import { ProfileEditor } from '../editor/ProfileEditor'
import { PATHS, applicationPath, updatePath } from '../paths'
import { AccountCard } from './CharityAccountCard'
import { CharityActions, type ActionKind } from './CharityActions'

const EDIT = 'rediget'

const Tabs = ({ editing, onChange }: { readonly editing: boolean; readonly onChange: (edit: boolean) => void }) => (
  <div role="tablist" aria-label={lv.detail.profile} className="mb-4 flex gap-2 border-b border-[var(--border-subtle)]">
    {[false, true].map((edit) => (
      <button
        key={String(edit)}
        type="button"
        role="tab"
        aria-selected={editing === edit}
        onClick={() => onChange(edit)}
        className={`-mb-px min-h-11 border-b-2 px-4 text-sm font-semibold ${
          editing === edit ? 'border-[var(--fill-accent)] text-[var(--text-accent)]' : 'border-transparent text-[var(--text-secondary)]'
        }`}
      >
        {edit ? lv.detail.editTab : lv.detail.profile}
      </button>
    ))}
  </div>
)

export const CharityDetailPage = () => {
  const { id = '' } = useParams()
  const api = useApi()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const editing = params.get('skats') === EDIT
  const [open, setOpen] = useState<ActionKind>()
  const { resource, reload, replace } = useResource(() => api.charity(id), id)

  return (
    <>
      <Link to={PATHS.charities} className="mb-4 inline-flex min-h-11 items-center text-sm font-medium text-[var(--text-accent)] underline">
        {lv.app.back}
      </Link>
      <Loaded resource={resource} onRetry={reload} rows={6}>
        {(c: AdminCharityDetail) => (
          <>
            <PageHeader
              title={c.name}
              actions={<CharityActions charity={c} open={open} setOpen={setOpen} onChanged={replace} onDeleted={() => navigate(PATHS.charities)} />}
            />
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <StatusBadge status={c.status} />
              {c.status === 'pending' && (
                <Link to={applicationPath(c.id)} className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--text-accent)] underline">
                  {lv.applications.title}
                </Link>
              )}
            </div>
            {c.pendingUpdate && (
              <p className="mb-4 flex flex-wrap items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border-accent-soft)] bg-[var(--surface-accent-soft)] p-3 text-sm">
                {lv.detail.pendingUpdate}
                <Link to={updatePath(c.id)} className="font-semibold text-[var(--text-accent)] underline">{lv.detail.reviewUpdate}</Link>
              </p>
            )}
            <AccountCard charity={c} />
            <Tabs editing={editing} onChange={(edit) => setParams(edit ? { skats: EDIT } : {}, { replace: true })} />
            {editing ? (
              <ProfileEditor key={c.updatedAt} id={c.id} initial={c.profile} onSaved={replace} />
            ) : (
              <ProfileView profile={c.profile} />
            )}
          </>
        )}
      </Loaded>
    </>
  )
}

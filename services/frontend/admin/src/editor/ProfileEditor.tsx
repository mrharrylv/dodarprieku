/**
 * The admin's full profile editor. Validates with the shared validator
 * before sending, so it never posts what the API would refuse, and maps
 * both local and server field errors onto the fields. Saving publishes.
 */
import { useCallback, useMemo, useState, type FormEvent } from 'react'
import type { AdminCharityDetail, CharityProfile } from '@shared/contracts'
import { validateProfile } from '@shared/validate'
import { Button } from '../components/ui'
import { IconAlert } from '../components/Icon'
import { useApi } from '../context/api'
import { useToast } from '../context/toast'
import { fmt, lv } from '../i18n/lv'
import { isApiError } from '../lib/api'
import { errorMessage, fieldErrorMessage } from '../lib/errors'
import { setIn } from '../lib/set-in'
import { checkFile, toUploadRequest } from '../lib/upload'
import { AddressSection, CategorySection, ContactSection, OrganizationSection } from './BasicSections'
import { EditorContext, type EditorApi } from './context'
import { DeliveryEditor } from './DeliveryEditor'
import { MediaSection } from './MediaSection'
import { NeedsEditor } from './NeedsEditor'
import { SponsorsEditor } from './SponsorsEditor'

interface Props {
  readonly id: string
  readonly initial: CharityProfile
  readonly onSaved: (detail: AdminCharityDetail) => void
}

export const ProfileEditor = ({ id, initial, onSaved }: Props) => {
  const api = useApi()
  const toast = useToast()
  const [profile, setProfile] = useState<CharityProfile>(initial)
  const [fields, setFields] = useState<Readonly<Record<string, string>>>({})
  const [busy, setBusy] = useState(false)
  const [formError, setFormError] = useState<string | undefined>()
  const dirty = profile !== initial

  const set = useCallback((path: string, value: unknown) => setProfile((p) => setIn(p, path, value)), [])

  const upload = useCallback(
    async (file: File, kind: 'photo' | 'logo') => {
      const problem = checkFile(file)
      if (problem) {
        toast.show(problem === 'type' ? lv.editor.fileType : lv.editor.fileSize, 'error')
        return undefined
      }
      try {
        const result = await api.upload(await toUploadRequest(file, kind))
        toast.show(lv.editor.uploaded)
        return result.key
      } catch (e) {
        toast.show(errorMessage(e), 'error')
        return undefined
      }
    },
    [api, toast],
  )

  const ctx = useMemo<EditorApi>(
    () => ({ profile, set, upload, error: (path) => (fields[path] ? fieldErrorMessage(fields[path]) : undefined) }),
    [profile, set, upload, fields],
  )

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const checked = validateProfile(profile)
    if (!checked.ok) {
      setFields(checked.fields)
      setFormError(fmt(lv.editor.invalid, { n: Object.keys(checked.fields).length }))
      return
    }
    setBusy(true)
    setFormError(undefined)
    try {
      const saved = await api.saveProfile(id, checked.value)
      setFields({})
      toast.show(lv.editor.saved)
      onSaved(saved)
    } catch (e) {
      if (isApiError(e) && Object.keys(e.fields).length > 0) setFields(e.fields)
      setFormError(errorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <EditorContext.Provider value={ctx}>
      <form onSubmit={(e) => void submit(e)} noValidate className="space-y-4">
        <p role="note" className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[var(--border-warning)] bg-[var(--surface-warning-soft)] p-4 text-sm font-medium text-[var(--text-warning)]">
          <IconAlert className="size-5 shrink-0" />
          {lv.editor.warn}
        </p>
        <OrganizationSection />
        <ContactSection />
        <AddressSection />
        <CategorySection />
        <MediaSection />
        <NeedsEditor />
        <DeliveryEditor />
        <SponsorsEditor />
        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] bg-[var(--surface-page)] py-3">
          {formError && <p role="alert" className="flex-1 text-sm font-medium text-[var(--text-danger)]">{formError}</p>}
          {!formError && dirty && <p className="flex-1 text-sm text-[var(--text-secondary)]">{lv.editor.unsaved}</p>}
          <Button disabled={!dirty || busy} onClick={() => { setProfile(initial); setFields({}); setFormError(undefined) }}>
            {lv.editor.discard}
          </Button>
          <Button type="submit" variant="primary" disabled={busy}>
            {busy ? lv.editor.saving : lv.editor.save}
          </Button>
        </div>
      </form>
    </EditorContext.Provider>
  )
}

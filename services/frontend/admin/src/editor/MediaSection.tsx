import { useState, type ChangeEvent } from 'react'
import { LIMITS, UPLOAD_CONTENT_TYPES } from '@shared/contracts'
import { Button } from '../components/ui'
import { fmt, lv } from '../i18n/lv'
import { mediaUrl } from '../lib/format'
import { useEditor } from './context'
import { Fieldset } from './inputs'

const ACCEPT = UPLOAD_CONTENT_TYPES.join(',')

export const FilePick = ({ label, onFile, disabled }: { readonly label: string; readonly onFile: (f: File) => Promise<void>; readonly disabled?: boolean }) => {
  const [busy, setBusy] = useState(false)
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    await onFile(file)
    setBusy(false)
  }
  return (
    <label className={`inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-md)] border border-[var(--border-strong)] px-4 text-sm font-semibold focus-within:outline-2 focus-within:outline-[var(--ring-accent)] ${disabled || busy ? 'opacity-60' : ''}`}>
      {busy ? lv.editor.uploading : label}
      <input type="file" accept={ACCEPT} className="sr-only" disabled={disabled || busy} onChange={(e) => void pick(e)} />
    </label>
  )
}

export const MediaSection = () => {
  const { profile, set, upload, error } = useEditor()
  const name = profile.organization.name
  const photos = profile.photos
  const addPhoto = async (file: File) => {
    const key = await upload(file, 'photo')
    if (key) set('photos', [...photos, key])
  }
  const setLogo = async (file: File) => {
    const key = await upload(file, 'logo')
    if (key) set('logo', key)
  }
  const photoError = error('photos')
  const logoError = error('logo')
  return (
    <Fieldset legend={lv.sections.media} error={photoError ?? logoError}>
      <div className="space-y-2 sm:col-span-2">
        <p className="text-sm font-medium">{lv.fields.logo}</p>
        <div className="flex flex-wrap items-center gap-3">
          {profile.logo && <img src={mediaUrl(profile.logo)} alt={fmt(lv.view.logoAlt, { name })} className="size-20 rounded-[var(--radius-md)] border border-[var(--border-subtle)] object-contain" />}
          <FilePick label={lv.editor.upload} onFile={setLogo} />
          {profile.logo && <Button variant="ghost" onClick={() => set('logo', undefined)}>{lv.editor.remove}</Button>}
        </div>
      </div>
      <div className="space-y-2 sm:col-span-2">
        <p className="text-sm font-medium">{lv.fields.photos} ({photos.length}/{LIMITS.maxPhotos})</p>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {photos.map((key, i) => (
            <li key={key} className="space-y-1">
              <img src={mediaUrl(key)} alt={fmt(lv.view.photoAlt, { name, n: i + 1 })} className="aspect-[4/3] w-full rounded-[var(--radius-md)] object-cover" />
              <div className="flex flex-wrap gap-1">
                {i === 0 ? (
                  <span className="inline-flex min-h-11 items-center text-xs font-semibold">{lv.view.cover}</span>
                ) : (
                  <Button variant="ghost" className="px-2 text-xs" onClick={() => set('photos', [key, ...photos.filter((p) => p !== key)])}>
                    {lv.editor.makeCover}
                  </Button>
                )}
                <Button variant="ghost" className="px-2 text-xs" onClick={() => set('photos', photos.filter((p) => p !== key))}>
                  {lv.editor.remove}
                </Button>
              </div>
            </li>
          ))}
        </ul>
        {photos.length < LIMITS.maxPhotos && <FilePick label={lv.editor.upload} onFile={addPhoto} />}
      </div>
    </Fieldset>
  )
}

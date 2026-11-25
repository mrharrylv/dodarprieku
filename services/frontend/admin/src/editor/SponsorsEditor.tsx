import { LIMITS } from '@shared/contracts'
import { Button } from '../components/ui'
import { lv } from '../i18n/lv'
import { mediaUrl } from '../lib/format'
import { useEditor } from './context'
import { Fieldset, TextInput } from './inputs'
import { FilePick } from './MediaSection'

export const SponsorsEditor = () => {
  const { profile, set, upload, error } = useEditor()
  const sponsors = profile.sponsors
  return (
    <Fieldset legend={lv.sections.sponsors} error={error('sponsors')}>
      <ul className="space-y-3 sm:col-span-2">
        {sponsors.map((s, i) => (
          <li key={`sponsor-${i}`} className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border-subtle)] p-3 sm:grid-cols-2">
            <TextInput path={`sponsors.${i}.name`} label={lv.fields.sponsorName} max={LIMITS.sponsorName} />
            <TextInput path={`sponsors.${i}.url`} label={lv.fields.sponsorUrl} type="url" max={LIMITS.url} optional />
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              {s.logo && <img src={mediaUrl(s.logo)} alt="" className="size-12 object-contain" />}
              <FilePick
                label={`${lv.fields.sponsorLogo}: ${lv.editor.upload}`}
                onFile={async (file) => {
                  const key = await upload(file, 'logo')
                  if (key) set(`sponsors.${i}.logo`, key)
                }}
              />
              {s.logo && <Button variant="ghost" onClick={() => set(`sponsors.${i}.logo`, undefined)}>{lv.editor.remove} {lv.fields.sponsorLogo}</Button>}
              <Button variant="ghost" onClick={() => set(`sponsors.${i}`, undefined)}>{lv.editor.remove} {s.name}</Button>
            </div>
          </li>
        ))}
      </ul>
      {sponsors.length < LIMITS.maxSponsors && (
        <div className="sm:col-span-2">
          <Button onClick={() => set('sponsors', [...sponsors, { name: '' }])}>{lv.editor.addSponsor}</Button>
        </div>
      )}
    </Fieldset>
  )
}

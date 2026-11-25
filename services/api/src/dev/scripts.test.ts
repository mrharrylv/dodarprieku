/** scripts/import-to-env.sh and remove-imported.sh, against a fake `aws` on PATH. */
import { spawnSync } from 'node:child_process'
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { importedItem } from '../test/imported'

const script = (name: string): string => fileURLToPath(new URL(`../../scripts/${name}`, import.meta.url))

// Logs each payload's task and item count; answers like the API would. FAIL_AT=n fails the n-th call.
const FAKE_AWS = `#!/usr/bin/env bash
set -euo pipefail
out="\${@: -1}"
payload=""
while [ $# -gt 0 ]; do case "$1" in --payload) payload="\${2#fileb://}"; shift;; esac; shift; done
n=$(( $(wc -l < "$AWS_LOG" 2>/dev/null || echo 0) + 1 ))
jq -c '{task, n: ((.items // []) | length), source, limit}' "$payload" >> "$AWS_LOG"
if [ "\${FAIL_AT:-0}" = "$n" ]; then echo '{"ok":false,"error":"boom"}' > "$out"; echo '{"StatusCode":200}'; exit 0; fi
case "$(jq -r .task "$payload")" in
  import-charities) jq -c '{ok: true, data: {imported: (.items|length), created: (.items|length), updated: 0, refused: []}}' "$payload" > "$out" ;;
  rebuild-snapshot) echo '{"ok":true,"data":{"written":true}}' > "$out" ;;
  remove-imported)
    left=$(( $(cat "$STATE") - 50 )); [ "$left" -lt 0 ] && left=0; echo "$left" > "$STATE"
    echo "{\\"ok\\":true,\\"data\\":{\\"removed\\":50,\\"remaining\\":$left}}" > "$out" ;;
esac
echo '{"StatusCode":200}'
`

const sandbox = () => {
  const dir = mkdtempSync(join(tmpdir(), 'dodar-import-'))
  writeFileSync(join(dir, 'aws'), FAKE_AWS)
  chmodSync(join(dir, 'aws'), 0o755)
  const log = join(dir, 'aws.log')
  const state = join(dir, 'state')
  writeFileSync(state, '120')
  const run = (name: string, args: readonly string[], env: Record<string, string> = {}) =>
    spawnSync('bash', [script(name), ...args], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${dir}:${process.env.PATH ?? ''}`, AWS_LOG: log, STATE: state, ...env },
    })
  const calls = (): { task: string; n: number; source: string | null; limit: number | null }[] =>
    readFileSync(log, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const file = join(dir, 'items.json')
  writeFileSync(file, JSON.stringify(Array.from({ length: 250 }, (_, i) => importedItem(i + 1))))
  return { run, calls, file }
}

describe('import-to-env.sh', () => {
  it('imports in order, in batches, then rebuilds the snapshot once', () => {
    const s = sandbox()
    const r = s.run('import-to-env.sh', ['dev-dodarprieku-api', s.file, '100'])
    expect(r.status).toBe(0)
    expect(s.calls().map((c) => [c.task, c.n])).toEqual([
      ['import-charities', 100], ['import-charities', 100], ['import-charities', 50], ['rebuild-snapshot', 0],
    ])
    expect(r.stdout).toContain('done: 250 of 250 imported (new 250, updated 0, refused 0); snapshot rebuilt')
  })

  it('stops at the first failed batch and never rebuilds', () => {
    const s = sandbox()
    const r = s.run('import-to-env.sh', ['fn', s.file, '100'], { FAIL_AT: '2' })
    expect(r.status).toBe(1)
    expect(s.calls().map((c) => c.task)).toEqual(['import-charities', 'import-charities'])
    expect(r.stderr).toContain('stopped after 100 imported')
  })

  it('refuses bad arguments before calling anything', () => {
    const s = sandbox()
    expect(s.run('import-to-env.sh', []).status).toBe(2)
    expect(s.run('import-to-env.sh', ['bad name', s.file]).status).toBe(2)
    expect(s.run('import-to-env.sh', ['fn', s.file, '500']).status).toBe(2)
    expect(s.run('import-to-env.sh', ['fn', '/nope.json']).status).toBe(2)
  })
})

describe('remove-imported.sh', () => {
  it('calls until nothing remains, with the source and a limit', () => {
    const s = sandbox()
    const r = s.run('remove-imported.sh', ['fn', 'import:charity-map-2026-11-25'])
    expect(r.status).toBe(0)
    expect(s.calls()).toHaveLength(3)
    expect(s.calls()[0]).toMatchObject({ task: 'remove-imported', source: 'import:charity-map-2026-11-25', limit: 50 })
    expect(r.stdout).toContain('done: 150 charities of import:charity-map-2026-11-25 removed')
  })

  it('stops on an error and refuses a source that is not an import', () => {
    const s = sandbox()
    expect(s.run('remove-imported.sh', ['fn', 'import:x'], { FAIL_AT: '1' }).status).toBe(1)
    expect(s.run('remove-imported.sh', ['fn', 'x"}']).status).toBe(2)
    expect(s.run('remove-imported.sh', ['fn']).status).toBe(2)
  })
})

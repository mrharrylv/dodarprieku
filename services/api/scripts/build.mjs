// Bundles the Lambda into dist/index.mjs. The Node 22 runtime ships the AWS
// SDK v3, so @aws-sdk/* stays external and the bundle stays small.
import { build } from 'esbuild'
import { rmSync } from 'node:fs'

rmSync(new URL('../dist', import.meta.url), { recursive: true, force: true })

await build({
  entryPoints: [new URL('../src/index.ts', import.meta.url).pathname],
  outfile: new URL('../dist/index.mjs', import.meta.url).pathname,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'esm',
  sourcemap: false,
  minify: false,
  legalComments: 'none',
  external: ['@aws-sdk/*'],
  logLevel: 'info',
})

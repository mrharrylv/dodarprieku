import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // The dev server is a local convenience wired by hand; the Lambda entry
      // is exercised through app.test.ts and index.test.ts.
      exclude: ['src/**/*.test.ts', 'src/test/**', 'src/dev/server.ts', 'src/index.ts', 'src/**/types.ts'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 75 },
    },
  },
})

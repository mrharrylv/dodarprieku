/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url))

/** Contracts, catalog and validators shared with the API and the website. */
const SHARED_DIR = here('../../shared/src')

/** The API's local dev server (seeds admin@example.com). */
const API_DEV_ORIGIN = 'http://localhost:8787'

/**
 * Served from the website bucket under admin/, on admin.<host>, so built
 * assets live under /admin/. The dev server keeps '/', so the router's paths
 * (/pieteikumi, ...) work as they do behind CloudFront.
 */
const BUILD_BASE = '/admin/'

export default defineConfig(({ command }) => ({
  base: command === 'build' ? BUILD_BASE : '/',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@shared': SHARED_DIR } },
  server: {
    port: 5174,
    strictPort: true,
    fs: { allow: [here('.'), SHARED_DIR] },
    proxy: Object.fromEntries(
      ['/api', '/media', '/data'].map((path) => [path, { target: API_DEV_ORIGIN, changeOrigin: true }]),
    ),
  },
  build: { chunkSizeWarningLimit: 1200 },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx', 'src/vite-env.d.ts', 'src/components/MapPin.tsx'],
      thresholds: { statements: 70, lines: 70, functions: 70, branches: 70 },
    },
  },
}))

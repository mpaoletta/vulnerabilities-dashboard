/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const apiProxy = { '/api': 'http://127.0.0.1:8000' }

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // `--mode review` (con `.env.review`) construye la edición sólo lectura en un directorio aparte.
  build: mode === 'review' ? { outDir: 'dist-review' } : undefined,
  // Forward /api to vulnerabilities-api (uvicorn on :8000) en dev y en `npm run preview`.
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: { modules: { classNameStrategy: 'non-scoped' } },
  },
}))

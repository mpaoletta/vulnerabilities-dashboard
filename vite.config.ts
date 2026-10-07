/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Destino del proxy `/api` (dev y preview): vulnerabilities-api en el host. Se cambia con
  // `API_PROXY_TARGET` (env o `.env.local`) si la API no corre en :8000; no llega al bundle.
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxy = { '/api': env.API_PROXY_TARGET || 'http://127.0.0.1:8000' }
  return {
    plugins: [react()],
    // `--mode review` (con `.env.review`) construye la edición sólo lectura en un directorio aparte.
    build: mode === 'review' ? { outDir: 'dist-review' } : undefined,
    // Forward /api to vulnerabilities-api en dev y en `npm run preview`.
    server: { proxy: apiProxy },
    preview: { proxy: apiProxy },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: { modules: { classNameStrategy: 'non-scoped' } },
    },
  }
})

/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Edición de build: `review` genera la edición sólo lectura. Ver `src/app/edition.ts`. */
  readonly VITE_EDITION?: 'full' | 'review'
  /** URL base de `vulnerabilities-api` (default `/api`, que Vite reenvía a :8000). */
  readonly VITE_API_BASE_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

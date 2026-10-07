// Edición de la app, fijada en build time con `VITE_EDITION` (ver `npm run build:review`).
// `full` es el dashboard completo; `review` es la edición sólo lectura para clientes:
// igual a la full pero sin las partes de ejecución de la remediación.
export type Edition = 'full' | 'review'

export function editionFrom(value: string | undefined): Edition {
  return value === 'review' ? 'review' : 'full'
}

/**
 * Edición review: sin fases ejecutables, sin Remediados y sin sus pasos en la guía.
 * Se compara `import.meta.env` directamente (y no vía `editionFrom`) para que quede una
 * constante que el bundler inline y así pode del bundle las ramas de ejecución.
 */
export const READONLY = import.meta.env.VITE_EDITION === 'review'

export const EDITION: Edition = READONLY ? 'review' : 'full'

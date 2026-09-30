// Único punto de acceso a los datos. Cuando exista `vulnerabilities-api`, se
// reemplaza `loadDataset()` por un `fetch('/api/…')` y el resto de la app no cambia.
import type { Dataset } from './types'

declare global {
  interface Window {
    RB_DATA?: Dataset
  }
}

const SCRIPT_URL = `${import.meta.env.BASE_URL}demo-data.js`

let pending: Promise<Dataset> | null = null

export function loadDataset(): Promise<Dataset> {
  if (window.RB_DATA) return Promise.resolve(window.RB_DATA)
  if (pending) return pending
  pending = new Promise<Dataset>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => {
      if (window.RB_DATA) resolve(window.RB_DATA)
      else reject(new Error('demo-data.js no definió window.RB_DATA'))
    }
    script.onerror = () => reject(new Error('No se pudo cargar ' + SCRIPT_URL))
    document.head.appendChild(script)
  }).catch((err: unknown) => {
    pending = null
    throw err
  })
  return pending
}

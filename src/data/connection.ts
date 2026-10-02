// Conexión a un portfolio real (tenant + API key) o `null` = dataset de demo.
// Vive sólo en `sessionStorage` (se pierde al cerrar la pestaña) y nunca en la URL ni en logs.
import { useSyncExternalStore } from 'react'

export interface Connection {
  tenant: string
  key: string
}

const STORAGE_KEY = 'rb-connection'

let current: Connection | null | undefined
const listeners = new Set<() => void>()

function isConnection(value: unknown): value is Connection {
  return (
    !!value &&
    typeof value === 'object' &&
    typeof (value as Connection).tenant === 'string' &&
    typeof (value as Connection).key === 'string' &&
    !!(value as Connection).tenant &&
    !!(value as Connection).key
  )
}

function readStorage(): Connection | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isConnection(parsed) ? { tenant: parsed.tenant, key: parsed.key } : null
  } catch {
    return null
  }
}

export function getConnection(): Connection | null {
  if (current === undefined) current = readStorage()
  return current
}

/** Guarda (o borra, con `null`) la conexión. Si el storage falla, vale sólo en memoria. */
export function setConnection(next: Connection | null): void {
  current = next
  try {
    if (next) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    else sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // storage bloqueado o ausente: queda en memoria
  }
  listeners.forEach((fn) => fn())
}

export function subscribe(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useConnection(): Connection | null {
  return useSyncExternalStore(subscribe, getConnection, getConnection)
}

/** Identidad estable de la fuente (sin exponer la key completa). */
export function connectionId(c: Connection | null): string {
  return c ? `tenant:${c.tenant}:${c.key.slice(0, 11)}` : 'demo'
}

/** Sólo para tests: olvida el estado en memoria para releer el storage. */
export function resetConnectionForTests(): void {
  current = undefined
}

// Único punto de acceso a los datos: pide el dataset a `vulnerabilities-api`, de la demo o
// de un portfolio conectado. Ningún otro módulo conoce la URL de la API, el tenant ni la key.
import { connectionId, type Connection } from './connection'
import type { Dataset } from './types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL ?? '/api').replace(/\/+$/, '')

/** Error de la API con su status HTTP (0 = sin respuesta). */
export class ApiError extends Error {
  readonly status: number
  /** `detail` del cuerpo de error, tal cual (puede ser un objeto estructurado). */
  readonly detail: unknown
  constructor(status: number, message: string, detail?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

/** URL de un recurso del tenant conectado: `${API_BASE_URL}/v1/tenants/{tenant}/{path}`. */
export function tenantUrl(connection: Connection, path: string): string {
  return `${API_BASE_URL}/v1/tenants/${encodeURIComponent(connection.tenant)}/${path.replace(/^\/+/, '')}`
}

/**
 * Request JSON autenticada contra el tenant conectado. Devuelve `null` en 204. Los errores
 * HTTP llegan como `ApiError` con el `detail` original (los 409/422 de jobs lo traen estructurado).
 */
export async function tenantRequest<T>(
  connection: Connection,
  path: string,
  init: { method?: 'GET' | 'POST'; body?: unknown } = {},
): Promise<T | null> {
  const url = tenantUrl(connection, path)
  const headers: Record<string, string> = { Accept: 'application/json', Authorization: `Bearer ${connection.key}` }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  let response: Response
  try {
    response = await fetch(url, {
      method: init.method ?? 'GET',
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    })
  } catch (err) {
    throw new ApiError(0, `No se pudo conectar con la API: ${err instanceof Error ? err.message : String(err)}`)
  }
  if (response.status === 204) return null
  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    if (response.ok) throw new ApiError(response.status, `La API respondió un cuerpo que no es JSON (${url})`)
  }
  if (!response.ok) {
    const detail = body && typeof body === 'object' && 'detail' in body ? (body as { detail: unknown }).detail : undefined
    const text =
      typeof detail === 'string'
        ? detail
        : detail && typeof detail === 'object' && 'message' in detail
          ? String((detail as { message: unknown }).message)
          : ''
    throw new ApiError(response.status, statusMessage(response.status, text), detail)
  }
  return body as T
}

const pending = new Map<string, Promise<Dataset>>()

function request(connection: Connection | null): { url: string; headers: Record<string, string> } {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (!connection) return { url: `${API_BASE_URL}/dataset`, headers }
  headers.Authorization = `Bearer ${connection.key}`
  return { url: `${API_BASE_URL}/v1/tenants/${encodeURIComponent(connection.tenant)}/dataset`, headers }
}

function statusMessage(status: number, detail: string): string {
  if (status === 401) return 'API key inválida'
  if (status === 403) return 'La API key no es de ese portfolio'
  return `La API respondió ${status}${detail ? `: ${detail}` : ''}`
}

async function fetchDataset(connection: Connection | null): Promise<Dataset> {
  const { url, headers } = request(connection)
  let response: Response
  try {
    response = await fetch(url, { headers })
  } catch (err) {
    throw new ApiError(0, `No se pudo conectar con la API (${url}): ${err instanceof Error ? err.message : String(err)}`)
  }
  if (!response.ok) {
    let detail = ''
    try {
      const body: unknown = await response.json()
      if (body && typeof body === 'object' && 'detail' in body) detail = String(body.detail)
    } catch {
      // cuerpo no JSON: alcanza con el status
    }
    throw new ApiError(response.status, statusMessage(response.status, detail))
  }
  try {
    return (await response.json()) as Dataset
  } catch {
    throw new ApiError(response.status, `La API respondió un cuerpo que no es JSON (${url})`)
  }
}

/**
 * El dataset de la fuente (`null` = demo). Se comparte la request en curso; al terminar se
 * olvida, así que un fallo no queda cacheado y reconectar trae datos frescos (el navegador
 * revalida con el `ETag` de la API y recibe 304 si nada cambió).
 */
export function loadDataset(connection: Connection | null = null): Promise<Dataset> {
  const id = connectionId(connection)
  const inFlight = pending.get(id)
  if (inFlight) return inFlight
  const promise = fetchDataset(connection).finally(() => pending.delete(id))
  pending.set(id, promise)
  return promise
}

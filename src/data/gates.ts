// Cliente de los gates de PR del tenant conectado (add-github-pr-gate): listado por repo y
// aprobación / revocación de un gate bloqueado (keys con `approveGates`).
import type { Connection } from './connection'
import { ApiError, tenantRequest } from './source'
import type { GateOverride, OverrideCreated, PrGate } from './types'

const gatesPath = (slug: string) => `repositories/${encodeURIComponent(slug)}/gates`

export async function listGates(c: Connection, slug: string): Promise<PrGate[]> {
  return (await tenantRequest<PrGate[]>(c, gatesPath(slug))) ?? []
}

export async function approveGate(c: Connection, slug: string, pr: number, reason: string): Promise<OverrideCreated> {
  const out = await tenantRequest<OverrideCreated>(c, `${gatesPath(slug)}/${pr}/override`, { method: 'POST', body: { reason } })
  if (!out) throw new ApiError(204, 'La API no devolvió la aprobación')
  return out
}

export async function revokeOverride(c: Connection, slug: string, pr: number, id: string): Promise<GateOverride> {
  const out = await tenantRequest<GateOverride>(c, `${gatesPath(slug)}/${pr}/override/${encodeURIComponent(id)}/revoke`, {
    method: 'POST',
  })
  if (!out) throw new ApiError(204, 'La API no devolvió la revocación')
  return out
}

/** Una clave bloqueante en lenguaje del operador. */
export function blockingLabel(key: string): string {
  if (key === 'sonar:quality-gate') return 'Quality Gate de SonarQube en ERROR'
  const [kind, ...rest] = key.split(':')
  if (kind === 'dep' && rest.length >= 3) {
    const vuln = rest[rest.length - 1]
    const pkg = rest.slice(1, -1).join(':')
    return `${pkg} (${rest[0]}) · ${vuln}`
  }
  if (kind === 'secret' && rest.length >= 2) return `secreto ${rest[0]} en ${rest.slice(1).join(':')}`
  return key
}

export const STATE_LABEL: Record<PrGate['state'], string> = {
  pass: 'pasa',
  blocked: 'bloqueada',
  approved: 'aprobada',
  error: 'error del gate',
}

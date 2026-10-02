// Cliente de los jobs de remediación del tenant conectado (crear, consultar, cancelar) y de lo
// que el dashboard necesita para habilitar la ejecución: scope de la key y workers conectados.
import type { Connection } from './connection'
import { ApiError, tenantRequest } from './source'
import type { FixPhaseKey, JobCreate, KeyInfo, RemediationJob, WorkerInfo } from './types'

const repoPath = (slug: string) => `repositories/${encodeURIComponent(slug)}/jobs`

function required<T>(value: T | null, what: string): T {
  if (value === null) throw new ApiError(204, `La API no devolvió ${what}`)
  return value
}

export async function createJob(c: Connection, slug: string, body: JobCreate): Promise<RemediationJob> {
  return required(await tenantRequest<RemediationJob>(c, repoPath(slug), { method: 'POST', body }), 'el job')
}

export async function getJob(c: Connection, slug: string, id: string): Promise<RemediationJob> {
  return required(await tenantRequest<RemediationJob>(c, `${repoPath(slug)}/${encodeURIComponent(id)}`), 'el job')
}

/** El job activo del repo (`queued`/`claimed`/`running`), o `null`. */
export async function getActiveJob(c: Connection, slug: string): Promise<RemediationJob | null> {
  const jobs = await tenantRequest<RemediationJob[]>(c, `${repoPath(slug)}?active=true`)
  return jobs && jobs.length ? jobs[0] : null
}

export async function cancelJob(c: Connection, slug: string, id: string): Promise<RemediationJob> {
  return required(
    await tenantRequest<RemediationJob>(c, `${repoPath(slug)}/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
    'el job',
  )
}

export async function getKeyInfo(c: Connection): Promise<KeyInfo> {
  return required(await tenantRequest<KeyInfo>(c, 'key'), 'la key')
}

export async function listWorkers(c: Connection): Promise<WorkerInfo[]> {
  return (await tenantRequest<WorkerInfo[]>(c, 'workers')) ?? []
}

export const ACTIVE_STATUSES = ['queued', 'claimed', 'running'] as const

export function isActive(job: RemediationJob | null | undefined): boolean {
  return !!job && (ACTIVE_STATUSES as readonly string[]).includes(job.status)
}

/** Motivos de fallo del worker/API en lenguaje del operador. */
const REASONS: Record<string, string> = {
  'dirty-working-tree': 'árbol de trabajo sucio',
  'missing-env-vars': 'falta una variable de entorno del build',
  'clone-not-found': 'el worker no encontró el clone del repo',
  'lease-expired': 'el worker dejó de responder',
  'stale-selection': 'hubo un review nuevo; volvé a ejecutar sobre los datos actuales',
  'worker-stopped': 'el worker se detuvo durante la ejecución',
  'phase-failed': 'la fase terminó con error',
}

/** Motivo legible de un job fallido (por `reason`, o por el exit code si no hay `reason`). */
export function failureText(job: Pick<RemediationJob, 'reason' | 'message' | 'exitCode'>): string {
  const byExit = job.exitCode === 8 ? REASONS['dirty-working-tree'] : job.exitCode === 23 ? REASONS['missing-env-vars'] : null
  const text = (job.reason && REASONS[job.reason]) || byExit || job.message || job.reason || 'error'
  return job.exitCode !== null && job.exitCode !== undefined ? `${text} (exit ${job.exitCode})` : text
}

/** Ítems no resueltos de un 422 de selección (`detail.unresolved`), listos para mostrar. */
export function unresolvedItems(err: unknown): string[] {
  if (!(err instanceof ApiError) || err.status !== 422) return []
  const d = err.detail as { unresolved?: Array<{ phase?: FixPhaseKey; item?: unknown }> } | undefined
  return (d?.unresolved ?? []).map((u) => {
    const item = u.item
    const label =
      item && typeof item === 'object'
        ? String((item as { package?: string; file?: string }).package ?? (item as { file?: string }).file ?? JSON.stringify(item))
        : String(item)
    return (u.phase ? u.phase + ': ' : '') + label
  })
}

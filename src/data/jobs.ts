// Cliente de los jobs de remediación del tenant conectado (crear, consultar, cancelar) y de lo
// que el dashboard necesita para habilitar la ejecución: scope de la key y workers conectados.
import type { Connection } from './connection'
import { ApiError, tenantRequest } from './source'
import type { FixPhaseKey, JobCreate, KeyInfo, RemediationJob, UnreviewedRepository, WorkerInfo } from './types'

const repoPath = (slug: string) => `repositories/${encodeURIComponent(slug)}/jobs`

function required<T>(value: T | null, what: string): T {
  if (value === null) throw new ApiError(204, `La API no devolvió ${what}`)
  return value
}

export async function createJob(c: Connection, slug: string, body: JobCreate): Promise<RemediationJob> {
  return required(await tenantRequest<RemediationJob>(c, repoPath(slug), { method: 'POST', body }), 'el job')
}

/** Encola el review del repo; la API lo registra si todavía no existe y un worker lo anuncia. */
export async function createReviewJob(c: Connection, slug: string): Promise<RemediationJob> {
  return required(await tenantRequest<RemediationJob>(c, repoPath(slug), { method: 'POST', body: { phases: ['review'] } }), 'el job')
}

/** Clones sin review de los workers en línea y repos registrados sin review. */
export async function listUnreviewed(c: Connection): Promise<UnreviewedRepository[]> {
  return (await tenantRequest<UnreviewedRepository[]>(c, 'unreviewed-repositories')) ?? []
}

export async function getJob(c: Connection, slug: string, id: string): Promise<RemediationJob> {
  return required(await tenantRequest<RemediationJob>(c, `${repoPath(slug)}/${encodeURIComponent(id)}`), 'el job')
}

/** El último job del repo (activo o terminado), o `null`: al abrir el proyecto, uno terminado
 * todavía explica el resultado de sus fases (p. ej. unidades salteadas). */
export async function getLatestJob(c: Connection, slug: string): Promise<RemediationJob | null> {
  const jobs = await tenantRequest<RemediationJob[]>(c, repoPath(slug))
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
  'branch-failed': 'no se pudo crear el branch (¿el clone tiene al menos un commit?)',
  'repository-reset': 'se borró el review del clone',
}

/** Motivo legible de un job fallido (por `reason`, o por el exit code si no hay `reason`). */
export function failureText(job: Pick<RemediationJob, 'reason' | 'message' | 'exitCode'>): string {
  const BY_EXIT: Record<number, string> = { 8: 'dirty-working-tree', 9: 'branch-failed', 23: 'missing-env-vars' }
  const byExit = job.exitCode != null && BY_EXIT[job.exitCode] ? REASONS[BY_EXIT[job.exitCode]] : null
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

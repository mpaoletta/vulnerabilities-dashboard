// Flujos impactados para el checklist de QA: port de `flowsFor` y del estado de QA.
import type { DependencyUpdate, RepositoryDetail } from '../data/types'

/** Responsable de QA por defecto (prop `qaResponsable` del prototipo). */
export const DEFAULT_QA_OWNER = 'QA · m.rodriguez'

export type FlowKind = 'dependencia' | 'código' | 'secretos' | 'transversal'

export interface Flow {
  fid: string
  name: string
  kind: FlowKind
  detail: string
}

export interface QaRecord {
  by: string
  at: string
}

export type QaMap = Record<string, QaRecord>

export function flowsFor(slug: string, d: RepositoryDetail | undefined): Flow[] {
  if (!d) return []
  const out: Omit<Flow, 'fid'>[] = []
  const ups: DependencyUpdate[] = []
  for (const l of d.dependencies.plan.levels || []) {
    if (l.applied !== false) (l.updates || []).forEach((u) => ups.push(u))
  }
  ups
    .sort((a, b) => (b.fixesCount || 0) - (a.fixesCount || 0))
    .slice(0, 4)
    .forEach((u) =>
      out.push({
        name: 'Regresión por ' + u.package,
        kind: 'dependencia',
        detail: (u.currentVersion || '—') + ' → ' + (u.targetPackage || u.targetVersion || 'cambio de fuente'),
      }),
    )
  ;(d.sast.files || [])
    .slice(0, 3)
    .forEach((f) => out.push({ name: f.file.split('/').pop()!, kind: 'código', detail: f.total + ' hallazgos · ' + f.file }))
  if ((d.secrets.active || 0) > 0)
    out.push({
      name: 'Configuración y credenciales',
      kind: 'secretos',
      detail: (d.secrets.activeFiles || 0) + ' archivos con secretos activos',
    })
  out.push({ name: 'Smoke test de toda la app', kind: 'transversal', detail: 'build + suite de tests completa' })
  return out.map((f, i) => ({ fid: slug + ':' + i, ...f }))
}

export type QaState = 'pendiente' | 'parcial' | 'verificado'

export function qaState(flows: Flow[], qa: QaMap): { state: QaState; done: number; total: number } {
  const done = flows.filter((f) => qa[f.fid]).length
  const state: QaState = done === 0 ? 'pendiente' : done === flows.length ? 'verificado' : 'parcial'
  return { state, done, total: flows.length }
}

export const QA_LABEL: Record<QaState, string> = {
  pendiente: 'pendiente de QA',
  parcial: 'verificación parcial',
  verificado: 'verificado',
}

/** Alterna el check de un flujo: registra `{by, at}` o lo elimina. */
export function toggleQa(qa: QaMap, fid: string, by: string, now: Date = new Date()): QaMap {
  const next = { ...qa }
  if (next[fid]) delete next[fid]
  else next[fid] = { by, at: now.toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) }
  return next
}

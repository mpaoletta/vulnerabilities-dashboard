// Estado de las fases de remediación: port de `phaseStatus`, `blockedBy`, `nextAfter`,
// `progress` y `ring` del prototipo.
import type { FixPhaseKey, FleetRepository, PhaseKey, PhaseStatus } from '../data/types'
import { phColor } from './format'

export const ORDER: FixPhaseKey[] = ['fixdeps', 'fixcode', 'fixsecrets']

/** Stats congeladas al arrancar una fase. */
export interface PhaseSnapshot {
  units: string
  t: number
  c: number
  fixes: number
}

/** Estado en memoria de una ejecución simulada (`phases[slug:fase]`). */
export interface PhaseRun {
  run: boolean
  done: boolean
  pct: number
  msg: string
  snap: PhaseSnapshot | null
}

export type StatusOf = (key: FixPhaseKey) => PhaseStatus

export function phaseKey(slug: string, key: PhaseKey): string {
  return slug + ':' + key
}

export function phaseStatus(row: FleetRepository | undefined, key: PhaseKey, run?: PhaseRun): PhaseStatus {
  if (run?.done) return 'done'
  if (run?.run) return 'running'
  const p = row ? row.demoState.phases.find((x) => x.phase === key) : undefined
  return p ? p.status : 'pending'
}

/** Primera fase previa que no está `done` ni `not-applicable`. */
export function blockedBy(statusOf: StatusOf, key: FixPhaseKey): FixPhaseKey | null {
  const i = ORDER.indexOf(key)
  for (let n = 0; n < i; n++) {
    const st = statusOf(ORDER[n])
    if (st !== 'done' && st !== 'not-applicable') return ORDER[n]
  }
  return null
}

/** Siguiente fase `pending` después de `key` (para encadenar). */
export function nextAfter(statusOf: StatusOf, key: FixPhaseKey): FixPhaseKey | null {
  const i = ORDER.indexOf(key)
  for (let n = i + 1; n < ORDER.length; n++) {
    if (statusOf(ORDER[n]) === 'pending') return ORDER[n]
  }
  return null
}

export interface PhaseLike {
  status: PhaseStatus
}

/** Fracción 0–1: hecha = 1, corriendo = 0.5, sin contar las que no aplican. */
export function progress(phases: PhaseLike[]): number {
  const w = phases.filter((p) => p.status !== 'not-applicable')
  if (!w.length) return 1
  return w.reduce((a, p) => a + (p.status === 'done' ? 1 : p.status === 'running' ? 0.5 : 0), 0) / w.length
}

/**
 * Anillo de 4 segmentos de 84° con 6° de separación. `live` dibuja sólo el
 * segmento `running` (capa roja pulsante); la capa base lo deja transparente.
 */
export function ringGradient(phases: PhaseLike[], live: boolean): string {
  return (
    'conic-gradient(' +
    phases
      .map((p, i) => {
        const col = live
          ? p.status === 'running'
            ? 'var(--red)'
            : 'transparent'
          : p.status === 'running'
            ? 'transparent'
            : phColor(p.status)
        const a = i * 90
        const b = a + 84
        return col + ' ' + a + 'deg ' + b + 'deg, transparent ' + b + 'deg ' + (a + 90) + 'deg'
      })
      .join(', ') +
    ')'
  )
}

import type { PhaseLastRun } from '../data/types'

const STATUS: Record<string, string> = {
  succeeded: 'completa',
  partial: 'parcial',
  failed: 'falló',
  cancelled: 'cancelada',
}
/** Exit code del orchestrator cuando el policy gate no pasa (el fix sí terminó). */
const POLICY_FAIL = 1

function when(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const p = (v: number) => String(v).padStart(2, '0')
  return ' ' + p(d.getDate()) + '/' + p(d.getMonth() + 1) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes())
}

/**
 * Resumen de la última corrida de una fase de fix: lo que el flujo marcó como corregido (no
 * hay re-scan; confirmarlo requiere un review nuevo). Se muestra aunque la fase vuelva a pendiente.
 */
export function lastRunText(lr: PhaseLastRun | null | undefined): string {
  if (!lr) return ''
  const parts = [lr.fixed + ' corregidas']
  if (lr.notFixed) parts.push(lr.notFixed + ' sin corregir')
  parts.push(STATUS[lr.status] ?? lr.status)
  if (lr.exitCode === POLICY_FAIL) parts.push('policy gate no pasa')
  return 'última corrida' + when(lr.completedAt) + ': ' + parts.join(' · ')
}

import { LOCAL_ONLY_MSG } from '../../app/jobRunner'
import { usePhaseRunnerContext } from '../../app/phaseRunner'
import { useStore } from '../../app/store'
import type { FleetRepository } from '../../data/types'
import { isActive } from '../../data/jobs'
import { ORDER, phaseKey, phaseStatus } from '../../domain/phases'
import styles from './EstimatePanel.module.css'

/** «Ejecutar las 3 fases en secuencia» del panel de estimación (sólo edición full). */
export function RunAllButton({ slug, row }: { slug: string; row: FleetRepository }) {
  const { state } = useStore()
  const runner = usePhaseRunnerContext()
  const real = runner.real
  const statusOf = (k: (typeof ORDER)[number]) => phaseStatus(row, k, state.phases[phaseKey(slug, k)])
  const allDone = ORDER.every((k) => {
    const st = statusOf(k)
    return st === 'done' || st === 'not-applicable'
  })

  if (real) {
    // Un único job con las fases que tienen unidades seleccionadas.
    // Sólo un job de fix cuenta como «en curso» acá; durante un review se muestra el motivo.
    const job = real.job(slug)
    const active = isActive(job) && !job?.phases.includes('review')
    const reason = real.blockReason(slug, [...ORDER])
    return (
      <>
        <button
          type="button"
          className={styles.runBtn}
          disabled={!!reason}
          title={reason || undefined}
          onClick={() => runner.runAll(slug)}
        >
          {active ? 'Job en curso…' : 'Ejecutar las 3 fases en secuencia'}
        </button>
        {reason && !active && <span className={styles.disclaimer}>{reason}</span>}
        <span className={styles.disclaimer}>{LOCAL_ONLY_MSG}</span>
      </>
    )
  }

  const running = ORDER.some((k) => state.phases[phaseKey(slug, k)]?.run)
  const runLabel = allDone ? 'Remediación completa' : running ? 'Ejecutando en secuencia…' : 'Ejecutar las 3 fases en secuencia'
  return (
    <button type="button" className={styles.runBtn} disabled={running} onClick={() => runner.runAll(slug)}>
      {runLabel}
    </button>
  )
}

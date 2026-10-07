import { REREVIEW_CONFIRM, reviewStatusText, type ReviewRunner } from '../app/reviewRunner'
import { isActive } from '../data/jobs'
import styles from './ReviewControls.module.css'

interface Props {
  runner: ReviewRunner
  slug: string
  /** «Re-ejecutar review» de un repo ya revisado: pide confirmación. */
  rerun?: boolean
}

/** Botón de review con su motivo de bloqueo, el estado del job y la cancelación en cola. */
export function ReviewControls({ runner, slug, rerun = false }: Props) {
  const job = runner.job(slug)
  const reason = runner.blockReason(slug)
  const error = runner.error(slug)
  const active = isActive(job)
  const onClick = () => {
    if (rerun && !window.confirm(REREVIEW_CONFIRM)) return
    runner.launch(slug)
  }
  return (
    <div className={styles.controls} data-review={slug}>
      <button type="button" className={styles.btn} disabled={!!reason} title={reason || undefined} onClick={onClick}>
        {active ? 'Review en curso…' : rerun ? 'Re-ejecutar review' : 'Ejecutar review'}
      </button>
      {job && <span className={styles.note}>{reviewStatusText(job)}</span>}
      {job?.status === 'queued' && (
        <button type="button" className={styles.ghost} onClick={() => runner.cancel(slug)}>
          Cancelar
        </button>
      )}
      {reason && !active && <span className={styles.note}>{reason}</span>}
      {error && job?.status !== 'failed' && <span className={styles.error}>{error}</span>}
    </div>
  )
}

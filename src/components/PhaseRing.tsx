import { progress, ringGradient, type PhaseLike } from '../domain/phases'
import styles from './PhaseRing.module.css'

interface Props {
  phases: PhaseLike[]
  label: string
  size?: number
}

/** Anillo de 4 segmentos (review, fixdeps, fixcode, fixsecrets) con la capa `running` pulsante. */
export function PhaseRing({ phases, label, size = 34 }: Props) {
  return (
    <div title={label} aria-label={label} role="img" className={styles.ring} style={{ width: size, height: size }}>
      <div className={styles.layer} style={{ background: ringGradient(phases, false) }} />
      <div className={`${styles.layer} ${styles.live}`} style={{ background: ringGradient(phases, true) }} />
      <span className={styles.pct}>{Math.round(progress(phases) * 100)}</span>
    </div>
  )
}

import type { ReactNode } from 'react'
import styles from './Donut.module.css'

interface Props {
  /** conic-gradient ya armado (ver `donut()` en domain/format). */
  background: string
  size: number
  /** Radio interno de la máscara en %, p. ej. 66 → `transparent 66%, #000 68%`. */
  hole: number
  label: string
  children?: ReactNode
}

export function Donut({ background, size, hole, label, children }: Props) {
  const mask = `radial-gradient(farthest-side, transparent ${hole}%, #000 ${hole + 2}%)`
  return (
    <div role="img" aria-label={label} className={styles.donut} style={{ width: size, height: size }}>
      <div className={styles.ring} style={{ background, WebkitMask: mask, mask }} />
      <div className={styles.center}>{children}</div>
    </div>
  )
}

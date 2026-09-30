import type { ReactNode } from 'react'
import styles from './Hexagon.module.css'

/** Hexágono pointy-top de 96×110px, la forma orgánica del brand. */
export function Hexagon({ bg, fg, children }: { bg: string; fg: string; children: ReactNode }) {
  return (
    <div className={styles.hex} style={{ background: bg }}>
      <span style={{ color: fg }}>{children}</span>
    </div>
  )
}

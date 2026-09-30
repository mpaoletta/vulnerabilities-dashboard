import type { CSSProperties, ReactNode } from 'react'
import styles from './Pill.module.css'

interface Props {
  bg: string
  fg: string
  children: ReactNode
  /** `sm` 10px (tabla, grilla), `md` 10.5px (remediados), `qa` pill de estado de QA. */
  size?: 'sm' | 'md' | 'qa'
  border?: string
  className?: string
}

export function Pill({ bg, fg, children, size = 'sm', border, className }: Props) {
  const style: CSSProperties = { background: bg, color: fg, border: border ? '1px solid ' + border : undefined }
  return (
    <span className={[styles.pill, styles[size], className].filter(Boolean).join(' ')} style={style}>
      {children}
    </span>
  )
}

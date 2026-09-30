import type { ReactNode } from 'react'
import styles from './SectionLabel.module.css'

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={[styles.label, className].filter(Boolean).join(' ')}>{children}</span>
}

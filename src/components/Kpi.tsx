import { Card } from './Card'
import { SectionLabel } from './SectionLabel'
import styles from './Kpi.module.css'

export function Kpi({ label, value, note }: { label: string; value: string | number; note: string }) {
  return (
    <Card className={styles.kpi}>
      <SectionLabel>{label}</SectionLabel>
      <span className={styles.value}>{value}</span>
      <span className={styles.note}>{note}</span>
    </Card>
  )
}

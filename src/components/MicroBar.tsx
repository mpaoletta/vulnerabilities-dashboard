import styles from './MicroBar.module.css'

/** Número + micro-barra de 6px (columnas Deps / Código / Secretos). */
export function MicroBar({ value, width, color }: { value: string; width: number; color: string }) {
  return (
    <div className={styles.cell}>
      <span className={styles.value}>{value}</span>
      <i className={styles.bar} style={{ background: color, width: width + 'px' }} />
    </div>
  )
}

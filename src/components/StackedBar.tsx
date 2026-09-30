import styles from './StackedBar.module.css'

export interface BarPart {
  k: string
  n: number
  color: string
}

/** Barra apilada de 12px con segmentos separados por 2px y leyenda «**n** clave». */
export function StackedBar({ parts }: { parts: BarPart[] }) {
  const tot = parts.reduce((a, p) => a + p.n, 0) || 1
  return (
    <>
      <div className={styles.bar}>
        {parts.map((p) => (
          <i key={p.k} title={p.k + ': ' + p.n} style={{ background: p.color, width: (p.n / tot) * 100 + '%' }} />
        ))}
      </div>
      <div className={styles.legend}>
        {parts.map((p) => (
          <span key={p.k}>
            <b>{p.n}</b> {p.k}
          </span>
        ))}
      </div>
    </>
  )
}

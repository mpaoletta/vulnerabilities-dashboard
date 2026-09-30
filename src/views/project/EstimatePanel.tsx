import { useStore } from '../../app/store'
import type { FleetRepository } from '../../data/types'
import type { LiveEstimate } from '../../domain/estimate'
import { dec, n, t, usd } from '../../domain/format'
import type { Items } from '../../domain/items'
import { ORDER, phaseKey, phaseStatus } from '../../domain/phases'
import styles from './EstimatePanel.module.css'

interface Props {
  slug: string
  row: FleetRepository
  items: Items
  est: LiveEstimate
  totalVulns: number
  onRunAll: () => void
}

export function EstimatePanel({ slug, row, items: it, est, totalVulns, onRunAll }: Props) {
  const { state } = useStore()
  const clean = totalVulns === 0
  const maxT = Math.max(...est.ph.map((p) => p.t)) || 1
  const statusOf = (k: (typeof ORDER)[number]) => phaseStatus(row, k, state.phases[phaseKey(slug, k)])
  const allDone = ORDER.every((k) => {
    const st = statusOf(k)
    return st === 'done' || st === 'not-applicable'
  })
  const running = ORDER.some((k) => state.phases[phaseKey(slug, k)]?.run)
  const runLabel = allDone ? 'Remediación completa' : running ? 'Ejecutando en secuencia…' : 'Ejecutar las 3 fases en secuencia'
  const note =
    'Residual sin fix: ' +
    n(row.potential) +
    ' de dependencias.' +
    (it.l4.length ? ' El nivel 4 se cuenta aparte.' : '') +
    (est.codeHidden > 0 ? ' Incluye ' + n(est.codeHidden) + ' unidades de código que no aparecen en el detalle.' : '') +
    (est.secHiddenFiles > 0 ? ' Incluye ' + n(est.secHiddenFiles) + ' archivos con secretos que no aparecen en el detalle.' : '')

  return (
    <aside data-tour="estimacion" className={styles.panel}>
      <div className={styles.head}>
        <span className={styles.label}>Estimación en vivo</span>
      </div>
      <div className={styles.phases}>
        {est.ph.map((p) => (
          <div key={p.name} className={styles.phase}>
            <div className={styles.phaseTop}>
              <span className={styles.phaseName}>{p.name}</span>
              <span className={styles.phaseTime}>{p.t ? t(p.t) : '—'}</span>
            </div>
            <div className={styles.phaseBottom}>
              <span className={styles.units}>{p.units}</span>
              <div className={styles.track}>
                <i style={{ width: (p.t / maxT) * 100 + '%' }} />
              </div>
              <span className={styles.cost}>{usd(p.c)}</span>
            </div>
          </div>
        ))}
      </div>
      {it.l4.length > 0 && (
        <div className={styles.l4}>
          <span className={styles.l4Label}>Nivel 4 · aparte</span>
          <span className={styles.l4Value}>
            {est.l4.n} de {it.l4.length} seleccionadas · {t(est.l4.t)} · {usd(est.l4.c)}
          </span>
          <span className={styles.small}>no se aplica automáticamente: requiere migración arquitectural coordinada</span>
        </div>
      )}
      <div className={styles.totals}>
        <div className={styles.totalRow}>
          <span className={styles.label}>Tiempo de fix</span>
          <span className={styles.totalTime}>{t(est.total)}</span>
        </div>
        <div className={styles.totalRow}>
          <span className={styles.label}>Costo de fix</span>
          <span className={styles.totalCost}>{usd(est.cost)}</span>
        </div>
      </div>
      <div className={styles.fixed}>
        <div className={styles.kv}>
          <span>Se corrigen</span>
          <b style={{ color: 'var(--teal)' }}>{clean ? '—' : n(est.fixes) + ' de ' + n(totalVulns)}</b>
        </div>
        <div className={styles.kv}>
          <span>Quedan abiertas</span>
          <b style={{ color: 'var(--bordo)' }}>{n(totalVulns - est.fixes)}</b>
        </div>
        <div className={styles.fixedBar}>
          <i style={{ width: (est.fixes / (totalVulns || 1)) * 100 + '%' }} />
        </div>
        <span className={styles.small}>{note}</span>
      </div>
      <div className={styles.run}>
        <button type="button" className={styles.runBtn} disabled={running} onClick={onRunAll}>
          {runLabel}
        </button>
        <span className={styles.disclaimer}>
          Tiempo y costo son proyecciones del modelo de estimación, no corridas medidas. Escalan con el tiempo de compilación del
          repo ({dec(row.compileTimeSeconds)} s).
        </span>
      </div>
    </aside>
  )
}

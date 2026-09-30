import { useStore } from '../../app/store'
import { Pill } from '../../components/Pill'
import { SectionLabel } from '../../components/SectionLabel'
import { useDataset } from '../../data/context'
import { DEFAULT_QA_OWNER, flowsFor, QA_LABEL, qaState, toggleQa } from '../../domain/flows'
import { hash, n, t, typeBg, typeFg, usd } from '../../domain/format'
import { ORDER } from '../../domain/phases'
import layout from '../shared/layout.module.css'
import styles from './RemediatedView.module.css'

const QA_COLORS = {
  pendiente: { bg: 'var(--line)', fg: 'var(--fg)' },
  parcial: { bg: 'var(--amber)', fg: 'var(--fg)' },
  verificado: { bg: 'var(--teal)', fg: '#fff' },
} as const

export function RemediatedView({ qaOwner = DEFAULT_QA_OWNER }: { qaOwner?: string }) {
  const D = useDataset()
  const { state, dispatch } = useStore()
  const qa = state.qa
  const list = D.fleet.repositories.filter((r) => r.demoState.stage === 'remediated')

  let fixedTot = 0
  let tTot = 0
  let cTot = 0
  list.forEach((r) => {
    fixedTot += r.vulnerabilities.dependencies - r.potential
    tTot += r.estimate.total.seconds
    cTot += r.estimate.total.usd
  })

  return (
    <main className={layout.main}>
      <div className={styles.titleRow}>
        <h1 className={styles.h1}>Repositorios remediados</h1>
        <span className={styles.summary}>
          {list.length} repos · {n(fixedTot)} vulnerabilidades de dependencias corregidas · {t(tTot)} y {usd(cTot)} estimados
        </span>
      </div>
      {list.map((r) => {
        const fixed = r.vulnerabilities.dependencies - r.potential
        const flows = flowsFor(r.slug, D.repositories[r.slug])
        const q = qaState(flows, qa)
        return (
          <section key={r.slug} className={styles.card}>
            <div className={styles.head}>
              <a href={'#/repo/' + r.slug} className={styles.slug}>
                {r.slug}
              </a>
              <Pill bg={typeBg(r.type)} fg={typeFg(r.type)} size="md">
                TIPO {r.type}
              </Pill>
              <span className={styles.stack}>{r.stack}</span>
              <Pill bg={QA_COLORS[q.state].bg} fg={QA_COLORS[q.state].fg} size="qa" className={styles.qaPill}>
                {QA_LABEL[q.state]}
              </Pill>
            </div>
            <div className={styles.cols}>
              <div className={styles.col}>
                <span className={styles.colLabel}>Dependencias</span>
                <div className={styles.depRow}>
                  <span className={styles.depFixed}>{n(fixed)}</span>
                  <span className={styles.depOf}>corregidas de {n(r.vulnerabilities.dependencies)}</span>
                </div>
                <div className={styles.depBar}>
                  <i style={{ width: (r.vulnerabilities.dependencies ? (fixed / r.vulnerabilities.dependencies) * 100 : 100) + '%' }} />
                </div>
                <span className={styles.depRest} style={{ color: r.potential ? 'var(--bordo)' : 'var(--fg3)' }}>
                  {r.potential ? n(r.potential) + ' residuales sin fix disponible' : 'sin residuales'}
                </span>
              </div>
              <div className={`${styles.col} ${styles.colTight}`}>
                <span className={styles.colLabel}>Código y secretos</span>
                <div className={styles.kv}>
                  <span>hallazgos SAST</span>
                  <b>{n(r.vulnerabilities.code)}</b>
                </div>
                <div className={styles.kv}>
                  <span>secretos activos</span>
                  <b>{n(r.vulnerabilities.secretsActive)}</b>
                </div>
                <div className={styles.kv}>
                  <span>unidades de trabajo</span>
                  <b>{n(r.units.fixdeps + r.units.fixcode + r.units.fixsecrets)}</b>
                </div>
              </div>
              <div className={`${styles.col} ${styles.colTight}`}>
                <span className={styles.colLabel}>Estimado por fase</span>
                {ORDER.map((k) => (
                  <div key={k} className={styles.kv}>
                    <span className={styles.mono}>{k}</span>
                    <b>
                      {t(r.estimate[k].seconds)} · {usd(r.estimate[k].usd)}
                    </b>
                  </div>
                ))}
                <div className={`${styles.kv} ${styles.total}`}>
                  <span>total</span>
                  <b>
                    {t(r.estimate.total.seconds)} · {usd(r.estimate.total.usd)}
                  </b>
                </div>
              </div>
              <div className={`${styles.col} ${styles.colTight} ${styles.colLast}`}>
                <span className={styles.colLabel}>Pull request (simulado)</span>
                <span className={styles.pr}>PR #{1200 + (hash(r.slug) % 700)}</span>
                <span className={styles.prMeta}>
                  {n(r.units.fixdeps + r.units.fixcode)} commits · {n(r.unitDetail.sastFiles + r.unitDetail.secretFiles)} archivos
                  tocados
                </span>
                <span className={styles.branch}>remediation/{r.slug}</span>
              </div>
            </div>
            <div data-tour={'flows-' + r.slug} className={styles.flows}>
              <div className={styles.flowsHead}>
                <SectionLabel>Flujos impactados — verificación manual de QA</SectionLabel>
                <span className={styles.qaCount}>
                  {q.done} de {q.total} flujos verificados
                </span>
                <div className={styles.qaBar}>
                  <i style={{ width: (q.total ? (q.done / q.total) * 100 : 0) + '%' }} />
                </div>
              </div>
              <div className={styles.flowList}>
                {flows.map((f) => {
                  const rec = qa[f.fid]
                  return (
                    <label key={f.fid} className={styles.flow}>
                      <input
                        type="checkbox"
                        checked={!!rec}
                        aria-label={'Verificado por QA: ' + f.name}
                        onChange={() => dispatch({ type: 'qa/set', qa: toggleQa(state.qa, f.fid, qaOwner) })}
                      />
                      <span className={styles.flowName} title={f.name}>
                        {f.name}
                      </span>
                      <span className={styles.flowKind}>{f.kind}</span>
                      <span className={styles.flowDetail} title={f.detail}>
                        {f.detail}
                      </span>
                      <span className={styles.stamp}>{rec ? rec.by + ' · ' + rec.at : 'sin verificar'}</span>
                    </label>
                  )
                })}
              </div>
            </div>
          </section>
        )
      })}
    </main>
  )
}

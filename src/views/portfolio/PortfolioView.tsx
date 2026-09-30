import { useMemo } from 'react'
import { useStore } from '../../app/store'
import { navigate } from '../../app/route'
import { Card } from '../../components/Card'
import { Kpi } from '../../components/Kpi'
import { MicroBar } from '../../components/MicroBar'
import { PhaseRing } from '../../components/PhaseRing'
import { Pill } from '../../components/Pill'
import { SectionLabel } from '../../components/SectionLabel'
import { StackedBar } from '../../components/StackedBar'
import { useDataset } from '../../data/context'
import type { FleetRepository } from '../../data/types'
import { n, t, typeBg, typeFg, usd } from '../../domain/format'
import { progress } from '../../domain/phases'
import layout from '../shared/layout.module.css'
import styles from './PortfolioView.module.css'

type Align = 'left' | 'right' | 'center'
const COLS: Array<[key: string, label: string, align: Align]> = [
  ['slug', 'Repositorio', 'left'],
  ['type', 'Tipo', 'left'],
  ['stack', 'Stack', 'left'],
  ['linesOfCode', 'LOC', 'right'],
  ['dv', 'Deps', 'right'],
  ['cv', 'Código', 'right'],
  ['sv', 'Secretos', 'right'],
  ['potential', 'Residual', 'right'],
  ['eta', 'Est. fix', 'right'],
  ['prog', 'Progreso', 'center'],
]

const TYPE_COLORS = { A: 'var(--teal)', B: 'var(--red)', 'N/A': 'var(--gray)' }
const SIZE_COLORS = { L: 'var(--bordo)', M: 'var(--amber)', S: 'var(--fg2)' }
const STAGE_COLORS = { remediated: 'var(--teal)', 'review-done': 'var(--line)', 'in-progress': 'var(--red)' }

const fixSeconds = (r: FleetRepository) => r.estimate.total.seconds - (r.reviewSeconds || 0)

function sortKey(r: FleetRepository, k: string): string | number {
  switch (k) {
    case 'dv':
      return r.vulnerabilities.dependencies
    case 'cv':
      return r.vulnerabilities.code
    case 'sv':
      return r.vulnerabilities.secretsActive
    case 'eta':
      return fixSeconds(r)
    case 'prog':
      return progress(r.demoState.phases)
    default:
      return (r as unknown as Record<string, string | number>)[k]
  }
}

function colors(keys: string[], palette: string[], fixed?: Record<string, string>) {
  return keys.map((k, i) => fixed?.[k] || palette[i % palette.length])
}

export function PortfolioView() {
  const { fleet: F } = useDataset()
  const { state, dispatch } = useStore()
  const P = state.portfolio
  const R = F.repositories

  const derived = useMemo(() => {
    const fleetEst = R.reduce((a, r) => a + fixSeconds(r), 0)
    const fleetCost = R.reduce((a, r) => a + r.estimate.total.usd, 0)
    const units = R.reduce((a, r) => a + r.units.fixdeps + r.units.fixcode + r.units.fixsecrets, 0)
    const langs = Object.entries(F.distributions.byLanguage).sort((a, b) => b[1] - a[1])
    const topSec = [...R].sort((a, b) => b.vulnerabilities.secretsActive - a.vulnerabilities.secretsActive)[0]
    const cx = R.filter((r) => r.complexity > 0)
      .sort((a, b) => b.complexity - a.complexity)
      .slice(0, 9)
    const mx = (f: (r: FleetRepository) => number) => Math.max(...R.map(f)) || 1
    return {
      fleetEst,
      fleetCost,
      units,
      langs,
      topSec,
      cx,
      mD: mx((r) => r.vulnerabilities.dependencies),
      mC: mx((r) => r.vulnerabilities.code),
      mSlog: Math.log10(mx((r) => r.vulnerabilities.secretsActive) + 1),
    }
  }, [R, F.distributions.byLanguage])

  const kpis = [
    {
      label: 'Repositorios',
      value: F.repositoryCount,
      note: R.filter((r) => r.compiles).length + ' compilan · ' + R.filter((r) => !r.compiles).length + ' con build roto',
    },
    {
      label: 'Vulnerabilidades',
      value: n(F.totals.dependencies + F.totals.code + F.totals.secretsActive),
      note: n(F.totals.dependencies) + ' deps · ' + n(F.totals.code) + ' código · ' + n(F.totals.secretsActive) + ' secretos activos',
    },
    { label: 'Residuales sin fix', value: n(F.totals.potential), note: 'quedan abiertas tras el nivel 3 del plan' },
    { label: 'Review acumulado', value: t(F.totals.reviewSeconds), note: n(F.totals.linesOfCode) + ' LOC analizadas' },
    { label: 'Fix estimado', value: t(derived.fleetEst), note: n(derived.units) + ' unidades · ' + usd(derived.fleetCost) + ' estimado' },
  ]

  const dist = (label: string, tour: string, obj: Record<string, number>, palette: string[], fixed?: Record<string, string>) => {
    const keys = Object.keys(obj)
    const cs = colors(keys, palette, fixed)
    return { label, tour, parts: keys.map((k, i) => ({ k, n: obj[k], color: cs[i] })) }
  }
  const distros = [
    dist('Tipo de proyecto', 'dist-tipo', F.distributions.byType, ['var(--teal)', 'var(--red)', 'var(--gray)'], TYPE_COLORS),
    dist('Tamaño (LOC)', 'dist-size', F.distributions.bySize, ['var(--bordo)', 'var(--amber)', 'var(--fg2)'], SIZE_COLORS),
    dist('Estado de avance', 'dist-stage', F.distributions.byStage, ['var(--teal)', 'var(--line)', 'var(--red)'], STAGE_COLORS),
    dist('Lenguaje', 'dist-lang', Object.fromEntries(derived.langs), [
      'var(--fg2)',
      'var(--teal)',
      'var(--amber)',
      'var(--bordo)',
      'var(--gray)',
      'var(--red)',
    ]),
  ]

  const dTot = F.totals.dependencies
  const dRes = F.totals.potential
  const vulnBars = [
    {
      label: 'Dependencias',
      total: n(dTot),
      detail: n(dTot - dRes) + ' corregibles · ' + n(dRes) + ' residuales',
      okw: ((dTot - dRes) / dTot) * 100 + '%',
      resw: (dRes / dTot) * 100 + '%',
    },
    { label: 'Código (SAST)', total: n(F.totals.code), detail: '100% corregibles', okw: '100%', resw: '0%' },
    {
      label: 'Secretos activos',
      total: n(F.totals.secretsActive),
      detail: 'triage por tipo + reescritura por archivo',
      okw: '100%',
      resw: '0%',
    },
  ]
  const { topSec, cx } = derived
  const lmax = cx.length ? Math.log10(cx[0].complexity) : 1

  const q = P.q.toLowerCase()
  const rows = R.filter(
    (r) =>
      (!q || r.slug.toLowerCase().indexOf(q) >= 0) &&
      (P.fType === 'todos' || r.type === P.fType) &&
      (P.fSize === 'todos' || r.size === P.fSize) &&
      (P.fLang === 'todos' || r.language === P.fLang) &&
      (P.fStage === 'todos' || r.demoState.stage === P.fStage),
  ).sort((a, b) => {
    const x = sortKey(a, P.sortK)
    const y = sortKey(b, P.sortK)
    return typeof x === 'string' ? x.localeCompare(y as string) * P.sortD : ((x as number) - (y as number)) * P.sortD
  })

  const opt = (arr: string[], l: string) => [{ v: 'todos', l }, ...arr.map((x) => ({ v: x, l: String(x) }))]
  const filters = [
    { key: 'fType', value: P.fType, options: opt(Object.keys(F.distributions.byType), 'Tipo: todos'), label: 'Filtrar por tipo' },
    { key: 'fSize', value: P.fSize, options: opt(['S', 'M', 'L'], 'Tamaño: todos'), label: 'Filtrar por tamaño' },
    { key: 'fLang', value: P.fLang, options: opt(derived.langs.map((l) => l[0]), 'Lenguaje: todos'), label: 'Filtrar por lenguaje' },
    { key: 'fStage', value: P.fStage, options: opt(Object.keys(F.distributions.byStage), 'Estado: todos'), label: 'Filtrar por estado' },
  ] as const

  const open = (slug: string) => {
    navigate('#/repo/' + slug)
    window.scrollTo(0, 0)
  }

  return (
    <main className={`${layout.main} ${layout.mainWide}`}>
      <section data-tour="kpis" className={styles.kpis}>
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </section>

      <section className={styles.distros}>
        {distros.map((d) => (
          <Card key={d.label} data-tour={d.tour} className={styles.distro}>
            <SectionLabel>{d.label}</SectionLabel>
            <StackedBar parts={d.parts} />
          </Card>
        ))}
      </section>

      <section className={styles.panels}>
        <Card pad="md" className={styles.panel}>
          <div className={layout.head}>
            <SectionLabel>Vulnerabilidades por tipo</SectionLabel>
            <span className={layout.note}>corregibles · residuales</span>
          </div>
          {vulnBars.map((v) => (
            <div key={v.label} className={styles.vuln}>
              <div className={styles.vulnHead}>
                <span className={styles.vulnLabel}>{v.label}</span>
                <span className={styles.vulnTotal}>{v.total}</span>
                <span className={styles.vulnDetail}>{v.detail}</span>
              </div>
              <div className={styles.vulnBar}>
                <i style={{ background: 'var(--teal)', width: v.okw }} />
                <i style={{ background: 'var(--bordo)', width: v.resw }} />
              </div>
            </div>
          ))}
          {topSec && (
            <span className={styles.foot}>
              {topSec.slug} concentra {n(topSec.vulnerabilities.secretsActive)} de los {n(F.totals.secretsActive)} secretos del
              portfolio — casi con certeza entropía de bundles vendorizados, que es lo que resuelve el triage de fixsecrets.
            </span>
          )}
        </Card>

        <Card pad="md" className={`${styles.panel} ${styles.panelTight}`}>
          <div className={layout.head}>
            <SectionLabel>Complejidad ciclomática · escala log</SectionLabel>
            {cx.length > 0 && (
              <span className={layout.note}>
                outlier: {cx[0].slug} con {n(cx[0].complexity)} · mediana 0
              </span>
            )}
          </div>
          {cx.map((r) => (
            <div key={r.slug} className={styles.cx}>
              <span className={styles.cxName}>{r.slug}</span>
              <div className={`${layout.track} ${styles.cxTrack}`}>
                <i style={{ background: 'var(--red)', width: Math.max(3, (Math.log10(r.complexity) / lmax) * 100) + '%' }} />
              </div>
              <span className={styles.cxVal}>{n(r.complexity)}</span>
            </div>
          ))}
        </Card>
      </section>

      <Card as="section" pad="none" className={styles.tableCard}>
        <div className={styles.toolbar}>
          <input
            value={P.q}
            onChange={(e) => dispatch({ type: 'portfolio/set', patch: { q: e.target.value } })}
            placeholder="Buscar repositorio…"
            aria-label="Buscar repositorio"
            className={styles.search}
          />
          {filters.map((f) => (
            <select
              key={f.key}
              value={f.value}
              aria-label={f.label}
              onChange={(e) => dispatch({ type: 'portfolio/set', patch: { [f.key]: e.target.value } })}
              className={styles.select}
            >
              {f.options.map((o) => (
                <option key={o.v} value={o.v}>
                  {o.l}
                </option>
              ))}
            </select>
          ))}
          <span className={styles.count}>
            {rows.length} de {R.length} repositorios
          </span>
        </div>
        <div data-tour="tabla" className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                {COLS.map(([key, label, align]) => (
                  <th
                    key={key}
                    data-tour={'col-' + key}
                    style={{ textAlign: align }}
                    aria-sort={P.sortK === key ? (P.sortD > 0 ? 'ascending' : 'descending') : undefined}
                    onClick={() => dispatch({ type: 'portfolio/sort', key, textual: align === 'left' })}
                  >
                    {label} {P.sortK === key ? (P.sortD > 0 ? '↑' : '↓') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const ringTitle =
                  r.demoState.stage + ' — ' + r.demoState.phases.map((p) => p.phase + ': ' + p.status).join(' · ')
                return (
                  <tr
                    key={r.slug}
                    data-tour={'row-' + r.slug}
                    tabIndex={0}
                    onClick={() => open(r.slug)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') open(r.slug)
                    }}
                  >
                    <td className={styles.slug}>{r.slug}</td>
                    <td>
                      <Pill bg={typeBg(r.type)} fg={typeFg(r.type)}>
                        {r.type}
                      </Pill>
                    </td>
                    <td className={styles.stack}>{r.stack}</td>
                    <td className={styles.loc}>
                      {n(r.linesOfCode)} <span className={styles.size}>{r.size}</span>
                    </td>
                    <td>
                      <MicroBar
                        value={n(r.vulnerabilities.dependencies)}
                        width={(r.vulnerabilities.dependencies / derived.mD) * 42 + 2}
                        color="var(--bordo)"
                      />
                    </td>
                    <td>
                      <MicroBar
                        value={n(r.vulnerabilities.code)}
                        width={(r.vulnerabilities.code / derived.mC) * 42 + 2}
                        color="var(--red)"
                      />
                    </td>
                    <td>
                      <MicroBar
                        value={n(r.vulnerabilities.secretsActive)}
                        width={(Math.log10(r.vulnerabilities.secretsActive + 1) / derived.mSlog) * 42 + 2}
                        color="var(--amber)"
                      />
                    </td>
                    <td
                      data-tour={'pot-' + r.slug}
                      className={styles.pot}
                      style={{ color: r.potential ? 'var(--bordo)' : 'var(--fg3)' }}
                    >
                      {r.potential ? n(r.potential) : '—'}
                    </td>
                    <td className={styles.eta}>{t(fixSeconds(r))}</td>
                    <td data-tour={'ring-' + r.slug} className={styles.ringCell}>
                      <PhaseRing phases={r.demoState.phases} label={ringTitle} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className={styles.tableFoot}>
          Nombres de repositorio anonimizados. Conteos, severidades, unidades y tiempos de review son reales; el estado de avance y
          las proyecciones de tiempo y costo son estimados de demo.
        </div>
      </Card>
    </main>
  )
}

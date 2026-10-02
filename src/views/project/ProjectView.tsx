import { useMemo } from 'react'
import { READONLY } from '../../app/edition'
import { selectionFor, useStore } from '../../app/store'
import { Card } from '../../components/Card'
import { Donut } from '../../components/Donut'
import { Hexagon } from '../../components/Hexagon'
import { SectionLabel } from '../../components/SectionLabel'
import { useConnection } from '../../data/connection'
import { useDataset } from '../../data/context'
import type { FleetRepository } from '../../data/types'
import { estimate } from '../../domain/estimate'
import { dec, donut, n, t, typeBg, typeFg } from '../../domain/format'
import { itemsFor } from '../../domain/items'
import layout from '../shared/layout.module.css'
import { EstimatePanel } from './EstimatePanel'
import { PhaseCards } from './PhaseCards'
import { PullRequestsPanel } from './PullRequestsPanel'
import { RunAllButton } from './RunAllButton'
import { SelectionGrid } from './SelectionGrid'
import styles from './ProjectView.module.css'

const blockName = (b: unknown) =>
  typeof b === 'string' ? b : ((b as { packageName?: string; package?: string; name?: string }).packageName ||
    (b as { package?: string }).package ||
    (b as { name?: string }).name ||
    '')

export function ProjectView({ slug }: { slug: string }) {
  const D = useDataset()
  const connection = useConnection()
  const { state } = useStore()
  const R = D.fleet.repositories
  const row = R.find((r) => r.slug === slug)!
  const d = D.repositories[slug]
  const items = itemsFor(d)
  const sel = selectionFor(state, slug, items)
  const est = useMemo(() => estimate(row, items, D.meta.estimationModel, sel), [row, items, D.meta.estimationModel, sel])

  const portfolio = useMemo(() => {
    const mx = (f: (r: FleetRepository) => number) => Math.max(...R.map(f)) || 1
    const pts = R.filter((r) => r.complexity > 0)
    const lx = (r: FleetRepository) => Math.log10(r.linesOfCode)
    const ly = (r: FleetRepository) => Math.log10(r.complexity)
    const top = [...pts].sort((a, b) => b.complexity - a.complexity)[0]
    return {
      cmax: mx((r) => r.complexity),
      cogmax: mx((r) => r.cognitiveComplexity),
      pts,
      top,
      x0: Math.min(...pts.map(lx)),
      x1: Math.max(...pts.map(lx)),
      y0: Math.min(...pts.map(ly)),
      y1: Math.max(...pts.map(ly)),
      lx,
      ly,
    }
  }, [R])

  const blocking = d.classification.blocking || []
  const typeHeadline =
    row.type === 'B' ? 'Bloqueado por arquitectura' : row.type === 'A' ? 'Remediable automáticamente' : 'Sin vulnerabilidades'
  const typeRationale = blocking.length
    ? 'Bloqueado por: ' + blocking.map(blockName).filter(Boolean).join(', ') + '. El nivel 4 del plan no se aplica solo.'
    : d.classification.rationale || ''
  const sizeNote = row.size === 'L' ? '> 300k' : row.size === 'M' ? '150k–300k' : '< 150k'
  const sizeBars = [
    { k: 'Complejidad', v: n(row.complexity), w: Math.max(1, (row.complexity / portfolio.cmax) * 100) + '%' },
    { k: 'Cognitiva', v: n(row.cognitiveComplexity), w: Math.max(1, (row.cognitiveComplexity / portfolio.cogmax) * 100) + '%' },
    { k: 'Duplicación', v: dec(row.duplicatedLinesDensity) + '%', w: Math.min(100, row.duplicatedLinesDensity) + '%' },
  ]

  const totalVulns = row.vulnerabilities.dependencies + row.vulnerabilities.code + row.vulnerabilities.secretsActive
  const fixable = totalVulns - row.potential
  const clean = totalVulns === 0
  const potPct = clean
    ? '—'
    : fixable / totalVulns > 0.995 && fixable < totalVulns
      ? '99,9%'
      : Math.round((fixable / totalVulns) * 100) + '%'
  const potNote = clean
    ? 'El review no encontró vulnerabilidades: no hay nada para remediar en este repositorio.'
    : 'Código y secretos se corrigen al 100%. De las ' +
      n(row.vulnerabilities.dependencies) +
      ' de dependencias, ' +
      n(row.potential) +
      ' quedan sin fix disponible tras el nivel 3.'

  const { pts, x0, x1, y0, y1, lx, ly, top } = portfolio
  const px = (r: FleetRepository) => 6 + ((lx(r) - x0) / (x1 - x0 || 1)) * 86 + '%'
  const py = (r: FleetRepository) => 8 + ((ly(r) - y0) / (y1 - y0 || 1)) * 82 + '%'
  const mePt = pts.find((r) => r.slug === slug)
  const scatterNote = mePt
    ? 'Solo los ' + pts.length + ' repos con complejidad reportada. Eje vertical hasta ' + n(top?.complexity) + ' (' + top?.slug + ').'
    : slug + ' no reporta complejidad; se muestra el portfolio como referencia.'

  const plan = d.dependencies.plan
  const maxLevel = Math.max(...plan.levels.map((l) => l.vulnerabilitiesFixed), plan.residualTotal || 0, 1)
  const levelBars = [
    ...plan.levels.map((l) => ({
      name: 'Nivel ' + l.level,
      meta: (l.dependenciesUpdated || 0) + ' librerías' + (l.applied === false ? ' · no se aplica' : ''),
      val: n(l.vulnerabilitiesFixed),
      w: Math.max(0, (l.vulnerabilitiesFixed / maxLevel) * 100) + '%',
      color: l.applied === false ? 'var(--amber)' : 'var(--teal)',
    })),
    {
      name: 'Residual',
      meta: (plan.residualByPackage || []).length + ' paquetes sin fix',
      val: n(plan.residualTotal || 0),
      w: Math.max(0, ((plan.residualTotal || 0) / maxLevel) * 100) + '%',
      color: 'var(--bordo)',
    },
  ]

  const facts = [
    {
      k: 'Compilación',
      v: row.compiles ? 'OK · ' + dec(row.compileTimeSeconds) + ' s' : 'falla',
      color: row.compiles ? 'var(--teal)' : 'var(--bordo)',
    },
    {
      k: 'Tests',
      v: row.testCases
        ? n(row.testCases) + ' casos' + (row.testBaselineFailing ? ' · ' + row.testBaselineFailing + ' ya fallaban' : ' · baseline verde')
        : 'sin tests',
      color: 'var(--fg)',
    },
    { k: 'Review', v: row.reviewSeconds ? t(row.reviewSeconds) : 'sin hallazgos', color: 'var(--fg)' },
    { k: 'Estado', v: row.demoState.stage, color: 'var(--fg)' },
  ]

  return (
    <main className={layout.main}>
      <a href="#/dashboard" className={styles.back}>
        ← Volver al portfolio
      </a>

      <div data-tour="repo-header" className={styles.repoHeader}>
        <h1 className={styles.h1}>{slug}</h1>
        <span className={styles.stack}>
          {row.stack} — {n(row.linesOfCode)} LOC · {n(d.sbom ? d.sbom.componentCount : 0)} componentes en el SBOM
        </span>
        <div data-tour="repo-facts" className={styles.facts}>
          {facts.map((f) => (
            <div key={f.k} className={styles.fact}>
              <span className={styles.factK}>{f.k}</span>
              <span className={styles.factV} style={{ color: f.color }}>
                {f.v}
              </span>
            </div>
          ))}
        </div>
      </div>

      <section data-tour="hero" className={styles.hero}>
        <Card pad="lg" data-tour="hero-tipo" className={styles.heroCard}>
          <Hexagon bg={typeBg(row.type)} fg={typeFg(row.type)}>
            {row.type}
          </Hexagon>
          <div className={styles.heroBody}>
            <SectionLabel>Tipo de proyecto</SectionLabel>
            <span className={styles.headline}>{typeHeadline}</span>
            <span className={styles.rule} />
            <span className={styles.rationale}>{typeRationale}</span>
          </div>
        </Card>

        <Card pad="lg" className={styles.heroCard}>
          <Hexagon bg="var(--fg)" fg="var(--bg)">
            {row.size}
          </Hexagon>
          <div className={`${styles.heroBody} ${styles.grow}`}>
            <SectionLabel>Tamaño y complejidad</SectionLabel>
            <div className={styles.locRow}>
              <span className={styles.loc}>{n(row.linesOfCode)}</span>
              <span className={styles.locNote}>LOC · {sizeNote}</span>
            </div>
            {sizeBars.map((s) => (
              <div key={s.k} className={styles.sizeBar}>
                <span className={styles.sizeK}>{s.k}</span>
                <div className={styles.sizeTrack}>
                  <i style={{ width: s.w }} />
                </div>
                <span className={styles.sizeV}>{s.v}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card pad="lg" className={styles.heroCard}>
          <Donut
            background={donut(clean ? 100 : (fixable / totalVulns) * 100, clean ? 'var(--line)' : 'var(--teal)')}
            size={116}
            hole={66}
            label={clean ? 'Sin vulnerabilidades' : potPct + ' remediable'}
          >
            <span className={styles.potPct}>{potPct}</span>
            <span className={styles.potSub}>remediable</span>
          </Donut>
          <div className={styles.heroBody}>
            <SectionLabel>Potencial de remediación</SectionLabel>
            <div className={styles.potRow}>
              <span className={styles.potFixable}>{clean ? '—' : n(fixable)}</span>
              <span className={styles.potTotal}>de {n(totalVulns)} vulnerabilidades</span>
            </div>
            <span className={styles.rationale}>{potNote}</span>
          </div>
        </Card>
      </section>

      <section className={styles.panels}>
        <Card pad="lg" className={styles.panel}>
          <div className={layout.head}>
            <SectionLabel>Tamaño vs. complejidad en el portfolio</SectionLabel>
            <span className={layout.note}>ambos ejes en escala log</span>
          </div>
          <div className={styles.scatter}>
            {pts.map((r) => {
              const me = r.slug === slug
              return (
                <div
                  key={r.slug}
                  title={r.slug + ' · ' + n(r.linesOfCode) + ' LOC · complejidad ' + n(r.complexity)}
                  className={styles.dot}
                  style={{
                    left: px(r),
                    bottom: py(r),
                    width: me ? 18 : 11,
                    height: me ? 18 : 11,
                    background: me ? 'var(--red)' : 'var(--gray)',
                    zIndex: me ? 1 : undefined,
                  }}
                />
              )
            })}
            {mePt && (
              <span className={styles.meLabel} style={{ left: `calc(${px(mePt)} + 14px)`, bottom: `calc(${py(mePt)} - 7px)` }}>
                {slug}
              </span>
            )}
          </div>
          <span className={layout.note}>{scatterNote}</span>
        </Card>

        <Card pad="lg" data-tour="plan-levels" className={styles.panel}>
          <div className={layout.head}>
            <SectionLabel>Plan de dependencias por nivel</SectionLabel>
            <span className={layout.note}>
              {n(d.dependencies.total)} vulns · se corrigen {n(d.dependencies.total - (plan.potentialAfterLevel3 || 0))}
            </span>
          </div>
          {levelBars.map((l) => (
            <div key={l.name} className={styles.level}>
              <div className={styles.levelHead}>
                <span className={styles.levelName}>{l.name}</span>
                <span className={layout.note}>{l.meta}</span>
                <span className={styles.levelVal} style={{ color: l.color }}>
                  {l.val}
                </span>
              </div>
              <div className={`${layout.track} ${styles.levelTrack}`}>
                <i style={{ background: l.color, width: l.w }} />
              </div>
            </div>
          ))}
          <div className={styles.legend}>
            <span>
              <i style={{ background: 'var(--teal)' }} />
              se corrige
            </span>
            <span>
              <i style={{ background: 'var(--amber)' }} />
              requiere migración arquitectural
            </span>
            <span>
              <i style={{ background: 'var(--bordo)' }} />
              sin fix disponible
            </span>
          </div>
        </Card>
      </section>

      <div className={styles.h2Row}>
        <h2 className={styles.h2}>Selección de vulnerabilidades a reparar</h2>
        <span className={styles.h2Sub}>cada cambio recalcula unidades de trabajo, tiempo y costo</span>
      </div>

      <section className={styles.work}>
        <SelectionGrid slug={slug} row={row} detail={d} items={items} sel={sel} est={est} />
        <EstimatePanel
          row={row}
          items={items}
          est={est}
          totalVulns={totalVulns}
          runAll={READONLY ? undefined : <RunAllButton slug={slug} row={row} />}
        />
      </section>

      {/* Ejecución de la remediación: no existe en la edición review. */}
      {!READONLY && <PhaseCards slug={slug} row={row} est={est} totalVulns={totalVulns} clean={clean} />}

      {/* Gates de PR (add-github-pr-gate): sólo con un portfolio real conectado. */}
      {!READONLY && D.meta.source === 'database' && connection && <PullRequestsPanel slug={slug} connection={connection} />}
    </main>
  )
}

import { useStore } from '../../app/store'
import { Pill } from '../../components/Pill'
import { TriCheckbox, type TriState } from '../../components/TriCheckbox'
import type { FleetRepository, RepositoryDetail } from '../../data/types'
import type { LiveEstimate } from '../../domain/estimate'
import { n, sevBg, sevFg, sevLabel } from '../../domain/format'
import type { DepItem, Items } from '../../domain/items'
import { bulkActions, poolFor, setSel, type Selection, type Tab } from '../../domain/selection'
import styles from './SelectionGrid.module.css'

interface Props {
  slug: string
  row: FleetRepository
  detail: RepositoryDetail
  items: Items
  sel: Selection
  est: LiveEstimate
}

interface GridRow {
  key: string
  name: string
  nameFull: string
  target: string
  targetFull: string
  sev: string
  sevBg: string
  sevFg: string
  kind: string
  scope: string
  info: string
  infoFull: string
  flag: string
  flagColor: string
  checked: boolean
  disabled: boolean
  fp?: boolean
  aria: string
  id?: string
}

interface Group {
  gkey: string
  title: string
  meta: string
  rows: GridRow[]
  ids: string[]
  /** El grupo Residual y los de «no listados» no se seleccionan. */
  selectable: boolean
  truncNote?: string
  /** Grupo informativo sin header colapsable. */
  static?: boolean
}

const TABS: Array<[Tab, string]> = [
  ['deps', 'Dependencias'],
  ['code', 'Código (SAST)'],
  ['secrets', 'Secretos'],
]

export function SelectionGrid({ slug, row, detail: d, items: it, sel, est }: Props) {
  const { state, dispatch } = useStore()
  const tab = state.tab
  const update = (fn: (s: Selection) => Selection) => dispatch({ type: 'sel/update', slug, items: it, fn })

  const pool = poolFor(it, tab)
  const selCount = pool.filter((x) => sel[x.id]).length

  const depRow = (u: DepItem): GridRow => {
    const target = u.targetPackage || u.targetVersion || 'cambio de fuente'
    return {
      key: u.id,
      id: u.id,
      name: u.package,
      nameFull: u.package + ' (' + (u.ecosystem || '') + ')',
      target: (u.currentVersion || '—') + ' → ' + target,
      targetFull: (u.currentVersion || '—') + ' → ' + target,
      sev: sevLabel(u.severity),
      sevBg: sevBg(u.severity),
      sevFg: sevFg(u.severity),
      kind: u.dependencyType === 'direct' ? 'directa' : 'transitiva',
      scope: u.applied === false ? 'nivel 4' : 'nivel ' + u.level,
      info: (u.fixesCount || 0) + ' CVEs' + (u.fixedVulnerabilityIdsTruncated ? ' (lista recortada)' : ''),
      infoFull: (u.fixedVulnerabilityIds || []).join(', ') + (u.fixedVulnerabilityIdsTruncated ? ' … de ' + u.fixesCount : ''),
      flag: u.applied === false ? 'requiere migración' : u.requiresCodeChange ? 'cambio de código' : 'bump simple',
      flagColor: u.applied === false ? 'var(--amber)' : u.requiresCodeChange ? 'var(--red)' : 'var(--fg3)',
      checked: !!sel[u.id],
      disabled: false,
      aria: 'Seleccionar ' + u.package,
    }
  }

  let groups: Group[]
  if (tab === 'deps') {
    const plan = d.dependencies.plan
    groups = plan.levels.map((l) => {
      const list = (l.applied === false ? it.l4 : it.deps).filter((x) => x.level === l.level)
      return {
        gkey: 'n' + l.level,
        title: l.title,
        meta: (l.vulnerabilitiesFixed || 0) + ' vulns · quedan ' + (l.vulnerabilitiesRemaining || 0),
        rows: list.map(depRow),
        ids: list.map((x) => x.id),
        selectable: true,
      }
    })
    groups.push({
      gkey: 'res',
      title: 'Residual — sin fix disponible',
      meta: n(plan.residualTotal || 0) + ' vulns · no seleccionable',
      ids: [],
      selectable: false,
      rows: (plan.residualByPackage || []).map((p, i) => ({
        key: 'res:' + i,
        name: p.package,
        nameFull: p.package + ' (' + p.ecosystem + ')',
        target: (p.installedVersion || '—') + ' → sin fix disponible',
        targetFull: 'no hay versión con fix publicada',
        sev: sevLabel(p.severity),
        sevBg: sevBg(p.severity),
        sevFg: sevFg(p.severity),
        kind: p.dependencyType === 'direct' ? 'directa' : 'transitiva',
        scope: 'residual',
        info: p.count + ' vulns' + (p.vulnerabilityIdsTruncated ? ' (lista recortada)' : ''),
        infoFull: (p.vulnerabilityIds || []).join(', ') + (p.vulnerabilityIdsTruncated ? ' … de ' + p.count : ''),
        flag: 'sin fix',
        flagColor: 'var(--bordo)',
        checked: false,
        disabled: true,
        aria: p.package + ' sin fix disponible',
      })),
    })
  } else if (tab === 'code') {
    groups = (d.sast.files || []).map((f, fi) => {
      const list = it.code.filter((x) => x.fi === fi)
      return {
        gkey: 'f:' + fi,
        title: f.file.split('/').pop()!,
        meta: f.file,
        ids: list.map((x) => x.id),
        selectable: true,
        truncNote:
          f.total > (f.findings || []).length ? 'se muestran ' + (f.findings || []).length + ' de ' + f.total + ' hallazgos de este archivo' : '',
        rows: list.map((x) => ({
          key: x.id,
          id: x.id,
          name: 'línea ' + x.line,
          nameFull: x.file + ':' + x.line,
          target: x.rule,
          targetFull: x.rule,
          sev: sevLabel(x.sev),
          sevBg: sevBg(x.sev),
          sevFg: sevFg(x.sev),
          kind: 'SAST',
          scope: 'archivo',
          info: x.message,
          infoFull: x.message,
          flag: '',
          flagColor: 'var(--fg3)',
          checked: !!sel[x.id],
          disabled: false,
          aria: 'Seleccionar hallazgo ' + x.file + ' línea ' + x.line,
        })),
      }
    })
    if (est.codeHidden > 0)
      groups.push({
        gkey: 'hidden',
        title: 'Unidades no listadas',
        meta: 'incluidas en la estimación',
        rows: [],
        ids: [],
        selectable: false,
        static: true,
        truncNote:
          n(est.codeHidden) +
          ' de ' +
          n(row.unitDetail.sastFiles) +
          ' unidades (archivo × severidad) no aparecen en el detalle, pero cuentan en la estimación (total real: ' +
          n(d.sast.total) +
          ' hallazgos).',
      })
  } else {
    groups = (d.secrets.files || []).map((f, fi) => {
      const list = it.secrets.filter((x) => x.fi === fi)
      return {
        gkey: 'k:' + fi,
        title: f.file.split('/').pop()!,
        meta: f.file,
        ids: list.map((x) => x.id),
        selectable: true,
        truncNote:
          f.total > (f.findings || []).length
            ? 'se muestran ' + (f.findings || []).length + ' de ' + n(f.total) + ' secretos de este archivo'
            : '',
        rows: list.map((x) => ({
          key: x.id,
          id: x.id,
          name: 'línea ' + x.line,
          nameFull: x.file + ':' + x.line,
          target: x.tipo,
          targetFull: x.tipo,
          sev: x.fp ? 'falso pos.' : 'activo',
          sevBg: x.fp ? 'var(--line)' : 'var(--amber)',
          sevFg: 'var(--fg)',
          kind: '',
          scope: x.verified ? 'verificado' : 'no verificado',
          info: x.file,
          infoFull: x.file,
          flag: '',
          flagColor: 'var(--fg3)',
          checked: !!sel[x.id],
          disabled: false,
          fp: x.fp,
          aria: 'Seleccionar secreto en ' + x.file,
        })),
      }
    })
    if (est.secHiddenFiles > 0)
      groups.push({
        gkey: 'hidden',
        title: 'Archivos no listados',
        meta: 'incluidos en la estimación',
        rows: [],
        ids: [],
        selectable: false,
        static: true,
        truncNote:
          n(est.secHiddenFiles) +
          ' de ' +
          n(row.unitDetail.secretFiles) +
          ' archivos con secretos activos no aparecen en el detalle, pero cuentan en la estimación (total real: ' +
          n(d.secrets.active) +
          ' secretos activos).',
      })
  }

  return (
    <div className={styles.grid}>
      <div className={styles.tabs} role="tablist">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            className={styles.tab}
            data-active={tab === k || undefined}
            onClick={() => dispatch({ type: 'tab/set', tab: k })}
          >
            {label}
          </button>
        ))}
      </div>
      <div data-tour="bulk" className={styles.bulk}>
        {bulkActions(it, tab, d).map((b) => (
          <button key={b.label} type="button" className={styles.bulkBtn} onClick={() => update(b.apply)}>
            {b.label}
          </button>
        ))}
        <span className={styles.selLabel}>
          {selCount} de {pool.length} seleccionadas
        </span>
      </div>
      <div data-tour="grid" className={styles.body}>
        {groups.map((g) => {
          const openKey = slug + '|' + g.gkey
          const on = g.ids.filter((i) => sel[i]).length
          const selectableRows = g.selectable ? g.rows.length : 0
          const isOpen = g.static
            ? true
            : state.open[openKey] !== undefined
              ? state.open[openKey]
              : selectableRows > 0 && selectableRows <= 40
          const tri: TriState = g.ids.length && on === g.ids.length ? 'all' : on ? 'some' : 'none'
          const count = g.static ? '' : g.rows.length + (g.ids.length ? ' · ' + on + ' sel.' : '')
          return (
            <div key={g.gkey} data-tour={'grupo-' + g.gkey.replace(/[^a-zA-Z0-9]+/g, '-')} className={styles.group}>
              <div className={styles.groupHead}>
                <TriCheckbox
                  state={tri}
                  empty={!g.ids.length}
                  label={'Seleccionar grupo ' + g.title}
                  onToggle={() => update((s) => setSel(s, g.ids, !(g.ids.length && on === g.ids.length)))}
                />
                <button
                  type="button"
                  className={styles.groupToggle}
                  aria-expanded={isOpen}
                  onClick={() => !g.static && dispatch({ type: 'open/set', key: openKey, value: !isOpen })}
                >
                  <span className={styles.chev}>{isOpen ? '▼' : '▶'}</span>
                  <span className={styles.groupTitle}>{g.title}</span>
                </button>
                <span className={styles.groupMeta}>{g.meta}</span>
                <span className={styles.groupCount}>{count}</span>
              </div>
              {isOpen && (
                <div>
                  {g.rows.map((r) => (
                    <div key={r.key} className={styles.row} style={{ opacity: r.disabled ? 0.55 : r.fp ? 0.5 : 1 }}>
                      <input
                        type="checkbox"
                        checked={r.checked}
                        disabled={r.disabled}
                        aria-label={r.aria}
                        onChange={() => r.id && update((s) => setSel(s, [r.id!], !s[r.id!]))}
                      />
                      <span className={styles.name} title={r.nameFull} style={{ textDecoration: r.fp ? 'line-through' : 'none' }}>
                        {r.name}
                      </span>
                      <span className={styles.target} title={r.targetFull}>
                        {r.target}
                      </span>
                      <Pill bg={r.sevBg} fg={r.sevFg} className={styles.sev}>
                        {r.sev}
                      </Pill>
                      <span className={styles.kind}>{r.kind}</span>
                      <span className={styles.scope}>{r.scope}</span>
                      <span className={styles.info} title={r.infoFull}>
                        {r.info}
                      </span>
                      <span className={styles.flag} style={{ color: r.flagColor }}>
                        {r.flag}
                      </span>
                    </div>
                  ))}
                  {g.truncNote && <div className={styles.trunc}>{g.truncNote}</div>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

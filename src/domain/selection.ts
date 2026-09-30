// Selección por repo: mapa `itemId → boolean`. Port de `selFor`, `setSel`, `only`
// y de las acciones masivas de la barra de cada tab.
import type { RepositoryDetail } from '../data/types'
import { sevLabel } from './format'
import type { Items } from './items'

export type Selection = Record<string, boolean>
export type Tab = 'deps' | 'code' | 'secrets'

/** Niveles 1–3, todo el SAST y los secretos que no son falsos positivos. */
export function defaultSelection(it: Items): Selection {
  const s: Selection = {}
  it.deps.forEach((d) => (s[d.id] = true))
  it.code.forEach((c) => (s[c.id] = true))
  it.secrets.forEach((k) => {
    if (!k.fp) s[k.id] = true
  })
  return s
}

export function setSel(sel: Selection, ids: string[], val: boolean): Selection {
  const next = { ...sel }
  ids.forEach((id) => (next[id] = val))
  return next
}

/** Deselecciona `all` y selecciona sólo `ids`. */
export function only(sel: Selection, all: string[], ids: string[]): Selection {
  const next = { ...sel }
  all.forEach((id) => (next[id] = false))
  ids.forEach((id) => (next[id] = true))
  return next
}

export interface Pooled {
  id: string
}

/** Ítems visibles en la tab: en Dependencias incluye el nivel 4. */
export function poolFor(it: Items, tab: Tab): Pooled[] {
  return tab === 'deps' ? [...it.deps, ...it.l4] : tab === 'code' ? it.code : it.secrets
}

export interface BulkAction {
  label: string
  apply: (sel: Selection) => Selection
}

const isCritHigh = (s: string | undefined) => s === 'CRITICAL' || s === 'HIGH'

export function bulkActions(it: Items, tab: Tab, d: RepositoryDetail): BulkAction[] {
  const pool = poolFor(it, tab)
  const allIds = pool.map((x) => x.id)
  const b: BulkAction[] = [
    { label: 'Seleccionar todo', apply: (s) => setSel(s, allIds, true) },
    { label: 'Deseleccionar todo', apply: (s) => setSel(s, allIds, false) },
  ]
  if (tab === 'deps') {
    const deps = [...it.deps, ...it.l4]
    b.push({ label: 'Solo Critical + High', apply: (s) => only(s, allIds, deps.filter((x) => isCritHigh(x.severity)).map((x) => x.id)) })
    b.push({ label: 'Sin cambio de código', apply: (s) => only(s, allIds, it.deps.filter((x) => !x.requiresCodeChange).map((x) => x.id)) })
    b.push({ label: 'Excluir nivel 4', apply: (s) => setSel(s, it.l4.map((x) => x.id), false) })
  } else if (tab === 'code') {
    Object.keys(d.sast.byRule || {})
      .slice(0, 4)
      .forEach((rule) =>
        b.push({ label: rule.split('.').pop()!, apply: (s) => only(s, allIds, it.code.filter((x) => x.rule === rule).map((x) => x.id)) }),
      )
    ;(['CRITICAL', 'HIGH'] as const).forEach((sv) => {
      if ((d.sast.severityCounts || {})[sv])
        b.push({ label: 'Solo ' + sevLabel(sv), apply: (s) => only(s, allIds, it.code.filter((x) => x.sev === sv).map((x) => x.id)) })
    })
  } else {
    b.push({ label: 'Solo activos', apply: (s) => only(s, allIds, it.secrets.filter((x) => !x.fp).map((x) => x.id)) })
    b.push({ label: 'Solo verificados', apply: (s) => only(s, allIds, it.secrets.filter((x) => x.verified).map((x) => x.id)) })
    b.push({ label: 'Excluir falsos positivos', apply: (s) => setSel(s, it.secrets.filter((x) => x.fp).map((x) => x.id), false) })
  }
  return b
}

/** Paso «Solo Critical + High» de la guía (`selectCritical`): deps 1–3 y código. */
export function selectCritical(sel: Selection, it: Items): Selection {
  const all = [...it.deps, ...it.l4, ...it.code, ...it.secrets].map((x) => x.id)
  const keep = [...it.deps.filter((x) => isCritHigh(x.severity)), ...it.code.filter((x) => isCritHigh(x.sev))].map((x) => x.id)
  return only(sel, all, keep)
}

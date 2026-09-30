// Port de `itemsFor()` del prototipo: aplana el detalle del repo en ítems seleccionables
// con ids estables (`d:` dependencias, `s:` hallazgos SAST, `k:` secretos).
import type { DependencyUpdate, RepositoryDetail, Severity } from '../data/types'

export interface DepItem extends DependencyUpdate {
  id: string
  level: number
  applied: boolean
}

export interface CodeItem {
  id: string
  fi: number
  file: string
  sev: Severity
  rule: string
  line: number
  message: string
}

export interface SecretItem {
  id: string
  fi: number
  file: string
  tipo: string
  line: number
  verified: boolean
  fp: boolean
}

export interface Items {
  deps: DepItem[]
  l4: DepItem[]
  code: CodeItem[]
  secrets: SecretItem[]
  /** Total real por par `archivo|severidad`. */
  codeReal: Record<string, number>
  /** Secretos activos reales por índice de archivo. */
  secretReal: Record<number, number>
}

export const EMPTY_ITEMS: Items = { deps: [], l4: [], code: [], secrets: [], codeReal: {}, secretReal: {} }

const cache = new WeakMap<RepositoryDetail, Items>()

export function itemsFor(d: RepositoryDetail | undefined): Items {
  if (!d) return EMPTY_ITEMS
  const hit = cache.get(d)
  if (hit) return hit

  const deps: DepItem[] = []
  const l4: DepItem[] = []
  for (const l of d.dependencies.plan.levels || []) {
    ;(l.updates || []).forEach((u, i) => {
      const it: DepItem = { id: 'd:' + l.level + ':' + u.package + ':' + i, level: l.level, applied: l.applied !== false, ...u }
      ;(l.applied === false ? l4 : deps).push(it)
    })
  }

  const code: CodeItem[] = []
  const codeReal: Record<string, number> = {}
  ;(d.sast.files || []).forEach((f, fi) => {
    for (const sv of Object.keys(f.severityCounts || {}) as Severity[]) codeReal[fi + '|' + sv] = f.severityCounts![sv]!
    ;(f.findings || []).forEach((x, i) =>
      code.push({ id: 's:' + fi + ':' + i, fi, file: f.file, sev: x.severity, rule: x.rule, line: x.line, message: x.message }),
    )
  })

  const secrets: SecretItem[] = []
  const secretReal: Record<number, number> = {}
  ;(d.secrets.files || []).forEach((f, fi) => {
    secretReal[fi] = f.active !== undefined ? f.active : f.total
    ;(f.findings || []).forEach((x, i) =>
      secrets.push({
        id: 'k:' + fi + ':' + i,
        fi,
        file: f.file,
        tipo: x.type,
        line: x.line,
        verified: !!x.verified,
        fp: !!x.falsePositive,
      }),
    )
  })

  const items: Items = { deps, l4, code, secrets, codeReal, secretReal }
  cache.set(d, items)
  return items
}

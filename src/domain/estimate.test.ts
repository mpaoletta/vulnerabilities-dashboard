import { describe, expect, it } from 'vitest'
import { demoDataset } from '../test/dataset'
import { estimate } from './estimate'
import { itemsFor } from './items'
import { defaultSelection, setSel } from './selection'

const D = demoDataset()
const M = D.meta.estimationModel

const near = (a: number, b: number, tol: number) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol + 1e-9)

describe('estimate — paridad con el dataset', () => {
  // Diferencia conocida con el dataset: el prototipo no cuenta el triage de los tipos de
  // secreto cuyos hallazgos son todos falsos positivos (arrancan deseleccionados), mientras
  // que `estimate.fixsecrets` del dataset sí los cuenta. Pasa en vega-web y antares-api.
  const fpOnlyTypes = (slug: string) => {
    const on = new Map<string, boolean>()
    for (const k of itemsFor(D.repositories[slug]).secrets) on.set(k.tipo, on.get(k.tipo) || !k.fp)
    return [...on.values()].filter((v) => !v).length
  }

  it.each(D.fleet.repositories.map((r) => [r.slug, r] as const))('%s', (_slug, row) => {
    const items = itemsFor(D.repositories[row.slug])
    const est = estimate(row, items, M, defaultSelection(items))
    const exp = row.estimate
    const [, deps, code, secrets] = est.ph
    const fpOnly = fpOnlyTypes(row.slug)
    near(deps.t, exp.fixdeps.seconds, 0.1)
    near(deps.c, exp.fixdeps.usd, 0.01)
    near(code.t, exp.fixcode.seconds, 0.1)
    near(code.c, exp.fixcode.usd, 0.01)
    near(secrets.t + fpOnly * M.fixsecrets.triageSecondsPerType, exp.fixsecrets.seconds, 0.1)
    near(secrets.c + fpOnly * M.fixsecrets.triageUsdPerType, exp.fixsecrets.usd, 0.01)
    expect(est.depSel.length).toBe(exp.fixdeps.units)
    expect(est.codeUnits).toBe(exp.fixcode.units)
    expect(est.secTypeUnits + fpOnly + est.secFileUnits).toBe(exp.fixsecrets.units)
  })

  it('sólo vega-web y antares-api tienen tipos de secreto sólo con falsos positivos', () => {
    const slugs = D.fleet.repositories.filter((r) => fpOnlyTypes(r.slug) > 0).map((r) => r.slug)
    expect(slugs.sort()).toEqual(['antares-api', 'vega-web'])
  })

  it('cubre los 70 repos', () => {
    expect(D.fleet.repositories).toHaveLength(70)
  })
})

describe('estimate — deselección parcial', () => {
  // un repo con un archivo SAST que tenga hallazgos en al menos 2 severidades
  const row = D.fleet.repositories.find((r) => {
    const files = D.repositories[r.slug].sast.files || []
    return files.some((f) => new Set((f.findings || []).map((x) => x.severity)).size >= 2)
  })!
  const items = itemsFor(D.repositories[row.slug])
  const base = estimate(row, items, M, defaultSelection(items))

  it('deseleccionar un archivo SAST con 2 severidades resta 2 unidades y su total real', () => {
    const fi = (D.repositories[row.slug].sast.files || []).findIndex(
      (f) => new Set((f.findings || []).map((x) => x.severity)).size >= 2,
    )
    const ids = items.code.filter((c) => c.fi === fi).map((c) => c.id)
    const sevs = [...new Set(items.code.filter((c) => c.fi === fi).map((c) => c.sev))]
    const real = sevs.reduce((a, s) => a + (items.codeReal[fi + '|' + s] || 0), 0)
    const est = estimate(row, items, M, setSel(defaultSelection(items), ids, false))
    expect(est.codeUnits).toBe(base.codeUnits - sevs.length)
    expect(est.ph[2].fixes).toBe(base.ph[2].fixes - real)
  })

  it('deseleccionar todo el SAST deja fixcode en 0', () => {
    const est = estimate(row, items, M, setSel(defaultSelection(items), items.code.map((c) => c.id), false))
    expect(est.ph[2].t).toBe(0)
    expect(est.ph[2].c).toBe(0)
  })

  it('deseleccionar un archivo de secretos resta su unidad y sus activos reales', () => {
    const srow = D.fleet.repositories.find((r) => itemsFor(D.repositories[r.slug]).secrets.some((k) => !k.fp))!
    const sit = itemsFor(D.repositories[srow.slug])
    const sbase = estimate(srow, sit, M, defaultSelection(sit))
    const fi = sit.secrets.find((k) => !k.fp)!.fi
    const ids = sit.secrets.filter((k) => k.fi === fi).map((k) => k.id)
    const est = estimate(srow, sit, M, setSel(defaultSelection(sit), ids, false))
    expect(est.secFileUnits).toBe(sbase.secFileUnits - 1)
    expect(est.ph[3].fixes).toBe(sbase.ph[3].fixes - sit.secretReal[fi])
  })

  it('el nivel 4 va aparte y no suma al total', () => {
    const lrow = D.fleet.repositories.find((r) => itemsFor(D.repositories[r.slug]).l4.length > 0)!
    const lit = itemsFor(D.repositories[lrow.slug])
    const b = estimate(lrow, lit, M, defaultSelection(lit))
    const est = estimate(lrow, lit, M, setSel(defaultSelection(lit), lit.l4.map((x) => x.id), true))
    expect(b.l4.n).toBe(0)
    expect(est.l4.n).toBe(lit.l4.length)
    expect(est.l4.t).toBeGreaterThan(0)
    expect(est.total).toBe(b.total)
  })
})

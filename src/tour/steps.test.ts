import { describe, expect, it } from 'vitest'
import { demoDataset } from '../test/dataset'
import { n } from '../domain/format'
import { buildTourSteps, demoScore, pickDemoRepos } from './steps'

const D = demoDataset()

describe('pickDemoRepos', () => {
  it('el principal es el de mayor puntaje', () => {
    const { main } = pickDemoRepos(D)
    const best = Math.max(...D.fleet.repositories.map((r) => demoScore(D, r)))
    expect(demoScore(D, main)).toBe(best)
  })
  it('puntaje: +4 B, +3 residual, +2 código, +2 secretos, +3 swap, +2 bloqueante', () => {
    const { main } = pickDemoRepos(D)
    const d = D.repositories[main.slug]
    const swap = d.dependencies.plan.levels.some((l) => (l.updates || []).some((u) => u.targetPackage))
    const expected =
      (main.type === 'B' ? 4 : 0) +
      (main.potential > 0 ? 3 : 0) +
      (main.vulnerabilities.code > 0 ? 2 : 0) +
      (main.vulnerabilities.secretsActive > 0 ? 2 : 0) +
      (swap ? 3 : 0) +
      ((d.classification.blocking || []).length ? 2 : 0)
    expect(demoScore(D, main)).toBe(expected)
  })
  it('topSecret y remediated', () => {
    const { topSecret, remediated } = pickDemoRepos(D)
    const max = Math.max(...D.fleet.repositories.map((r) => r.vulnerabilities.secretsActive))
    expect(topSecret.vulnerabilities.secretsActive).toBe(max)
    expect(remediated.demoState.stage).toBe('remediated')
  })
})

describe('buildTourSteps', () => {
  const steps = buildTourSteps(D)
  it('21 pasos visibles + cierre', () => {
    expect(steps).toHaveLength(22)
    expect(steps.filter((s) => !s.closing)).toHaveLength(21)
    expect(steps.at(-1)!.closing).toBe(true)
    steps.forEach((s, i) => expect(s.idx).toBe(i))
  })
  it('actos 0–4 en orden', () => {
    const acts = steps.map((s) => s.act)
    expect([...acts].sort()).toEqual(acts)
    expect(new Set(acts)).toEqual(new Set([0, 1, 2, 3, 4]))
  })
  it('textos derivados del dataset', () => {
    const F = D.fleet
    const totalV = F.totals.dependencies + F.totals.code + F.totals.secretsActive
    expect(steps[1].title).toBe(F.repositoryCount + ' repositorios, ' + n(totalV) + ' hallazgos')
    const { main, topSecret, remediated } = pickDemoRepos(D)
    expect(steps[9].target).toBe('[data-tour="row-' + topSecret.slug + '"]')
    expect(steps[10].title).toBe(main.slug + ', tipo ' + main.type)
    expect(steps[20].target).toBe('[data-tour="flows-' + remediated.slug + '"]')
    expect(steps[7].body).toContain(n(F.totals.potential))
  })
  it('los pasos del proyecto operan la UI', () => {
    const res = steps.find((s) => s.title === 'Lo que no tiene arreglo')!
    expect(res).toMatchObject({ tab: 'deps', expand: ['res'], target: '[data-tour="grupo-res"]' })
    expect(steps.find((s) => s.selectCritical)!.target).toBe('[data-tour="bulk"]')
  })
  it('los pasos con foco tienen target y los de placa no', () => {
    steps.forEach((s) => expect(!!s.target).toBe(!s.plate))
  })
})

describe('buildTourSteps en la edición review', () => {
  const full = buildTourSteps(D, false)
  const review = buildTourSteps(D, true)
  it('omite los 2 pasos de ejecución y conserva el resto en orden', () => {
    expect(review).toHaveLength(full.length - 2)
    expect(review.map((s) => s.title)).toEqual(full.filter((s) => !s.execution).map((s) => s.title))
    expect(review.map((s) => s.idx)).toEqual(review.map((_, i) => i))
    expect(review.at(-1)!.closing).toBe(true)
  })
  it('ningún paso apunta a fases, flujos de QA ni Remediados', () => {
    expect(review.some((s) => s.target === '[data-tour="fases"]')).toBe(false)
    expect(review.some((s) => (s.target || '').startsWith('[data-tour="flows-'))).toBe(false)
    expect(review.some((s) => s.route === '#/remediados')).toBe(false)
  })
  it('la edición full no cambia', () => {
    expect(full).toHaveLength(22)
    expect(full.filter((s) => s.execution)).toHaveLength(2)
  })
})

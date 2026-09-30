import { describe, expect, it } from 'vitest'
import { demoDataset } from '../test/dataset'
import { flowsFor, qaState, toggleQa } from './flows'

const D = demoDataset()
const remediated = D.fleet.repositories.filter((r) => r.demoState.stage === 'remediated')

describe('flowsFor', () => {
  it('ids estables y orden: deps, código, secretos, smoke', () => {
    for (const r of remediated) {
      const flows = flowsFor(r.slug, D.repositories[r.slug])
      flows.forEach((f, i) => expect(f.fid).toBe(r.slug + ':' + i))
      expect(flows.at(-1)!.name).toBe('Smoke test de toda la app')
      expect(flows.at(-1)!.kind).toBe('transversal')
      const kinds = flows.map((f) => f.kind)
      expect([...kinds].sort((a, b) => order(a) - order(b))).toEqual(kinds)
      expect(kinds.filter((k) => k === 'dependencia').length).toBeLessThanOrEqual(4)
      expect(kinds.filter((k) => k === 'código').length).toBeLessThanOrEqual(3)
    }
  })

  it('las dependencias van ordenadas por fixesCount', () => {
    const r = remediated.find((x) => flowsFor(x.slug, D.repositories[x.slug]).filter((f) => f.kind === 'dependencia').length >= 2)!
    const d = D.repositories[r.slug]
    const ups = d.dependencies.plan.levels.filter((l) => l.applied !== false).flatMap((l) => l.updates || [])
    const top = [...ups].sort((a, b) => (b.fixesCount || 0) - (a.fixesCount || 0))[0]
    expect(flowsFor(r.slug, d)[0].name).toBe('Regresión por ' + top.package)
  })

  it('sin secretos activos no hay «Configuración y credenciales»', () => {
    const r = D.fleet.repositories.find((x) => (D.repositories[x.slug].secrets.active || 0) === 0)!
    const names = flowsFor(r.slug, D.repositories[r.slug]).map((f) => f.name)
    expect(names).not.toContain('Configuración y credenciales')
  })

  it('con secretos activos sí aparece', () => {
    const r = D.fleet.repositories.find((x) => (D.repositories[x.slug].secrets.active || 0) > 0)!
    expect(flowsFor(r.slug, D.repositories[r.slug]).map((f) => f.name)).toContain('Configuración y credenciales')
  })

  it('repo inexistente → sin flujos', () => {
    expect(flowsFor('x', undefined)).toEqual([])
  })
})

describe('qaState / toggleQa', () => {
  const flows = Array.from({ length: 7 }, (_, i) => ({ fid: 'r:' + i, name: '', kind: 'código' as const, detail: '' }))
  it('pendiente / parcial / verificado', () => {
    expect(qaState(flows, {}).state).toBe('pendiente')
    const qa3 = { 'r:0': { by: 'x', at: '' }, 'r:1': { by: 'x', at: '' }, 'r:2': { by: 'x', at: '' } }
    expect(qaState(flows, qa3)).toEqual({ state: 'parcial', done: 3, total: 7 })
    const all = Object.fromEntries(flows.map((f) => [f.fid, { by: 'x', at: '' }]))
    expect(qaState(flows, all).state).toBe('verificado')
  })
  it('toggle registra y elimina', () => {
    const now = new Date(2026, 8, 29, 14, 5)
    const on = toggleQa({}, 'r:0', 'QA · m.rodriguez', now)
    expect(on['r:0'].by).toBe('QA · m.rodriguez')
    expect(on['r:0'].at).toMatch(/^29\/0?9/)
    expect(toggleQa(on, 'r:0', 'QA')).toEqual({})
  })
})

function order(k: string) {
  return ['dependencia', 'código', 'secretos', 'transversal'].indexOf(k)
}

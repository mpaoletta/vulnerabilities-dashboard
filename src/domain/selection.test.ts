import { describe, expect, it } from 'vitest'
import { demoDataset } from '../test/dataset'
import { itemsFor } from './items'
import { bulkActions, defaultSelection, only, poolFor, selectCritical, setSel } from './selection'

const D = demoDataset()
const withL4 = D.fleet.repositories.find((r) => itemsFor(D.repositories[r.slug]).l4.length > 0)!
const withFp = D.fleet.repositories.find((r) => itemsFor(D.repositories[r.slug]).secrets.some((k) => k.fp))!

describe('items', () => {
  it('ids con prefijos d:, s: y k:', () => {
    const items = itemsFor(D.repositories[withFp.slug])
    expect(items.secrets[0].id).toMatch(/^k:\d+:\d+$/)
    const any = itemsFor(D.repositories[withL4.slug])
    expect(any.deps[0].id).toMatch(/^d:\d+:.+:\d+$/)
    expect(any.l4.every((x) => !x.applied)).toBe(true)
  })
  it('se memoiza por repo', () => {
    const d = D.repositories[withL4.slug]
    expect(itemsFor(d)).toBe(itemsFor(d))
  })
})

describe('defaultSelection', () => {
  it('niveles 1–3, todo el SAST y los secretos activos; no el nivel 4 ni los falsos positivos', () => {
    const items = itemsFor(D.repositories[withL4.slug])
    const s = defaultSelection(items)
    expect(items.deps.every((x) => s[x.id])).toBe(true)
    expect(items.l4.some((x) => s[x.id])).toBe(false)
    expect(items.code.every((x) => s[x.id])).toBe(true)
    const f = itemsFor(D.repositories[withFp.slug])
    const sf = defaultSelection(f)
    expect(f.secrets.filter((k) => k.fp).some((k) => sf[k.id])).toBe(false)
    expect(f.secrets.filter((k) => !k.fp).every((k) => sf[k.id])).toBe(true)
  })
})

describe('setSel / only', () => {
  it('no muta y aplica', () => {
    const s = { a: true }
    const n = setSel(s, ['a', 'b'], false)
    expect(s).toEqual({ a: true })
    expect(n).toEqual({ a: false, b: false })
    expect(only({ a: true, b: true }, ['a', 'b'], ['b'])).toEqual({ a: false, b: true })
  })
})

describe('bulkActions', () => {
  const d = D.repositories[withL4.slug]
  const items = itemsFor(d)
  const labels = (tab: 'deps' | 'code' | 'secrets') => bulkActions(items, tab, d).map((b) => b.label)

  it('dependencias', () => {
    expect(labels('deps')).toEqual([
      'Seleccionar todo',
      'Deseleccionar todo',
      'Solo Critical + High',
      'Sin cambio de código',
      'Excluir nivel 4',
    ])
    const act = (l: string) => bulkActions(items, 'deps', d).find((b) => b.label === l)!.apply(defaultSelection(items))
    const ch = act('Solo Critical + High')
    const pool = poolFor(items, 'deps') as typeof items.deps
    pool.forEach((x) => expect(!!ch[x.id]).toBe(x.severity === 'CRITICAL' || x.severity === 'HIGH'))
    const all = act('Seleccionar todo')
    expect(pool.every((x) => all[x.id])).toBe(true)
    const noL4 = bulkActions(items, 'deps', d).find((b) => b.label === 'Excluir nivel 4')!.apply(all)
    expect(items.l4.some((x) => noL4[x.id])).toBe(false)
  })

  it('código: una pill por regla con el último segmento', () => {
    const rules = Object.keys(d.sast.byRule || {}).slice(0, 4).map((r) => r.split('.').pop())
    expect(labels('code').slice(2, 2 + rules.length)).toEqual(rules)
  })

  it('secretos', () => {
    expect(labels('secrets')).toEqual([
      'Seleccionar todo',
      'Deseleccionar todo',
      'Solo activos',
      'Solo verificados',
      'Excluir falsos positivos',
    ])
  })
})

describe('selectCritical', () => {
  it('deja sólo deps 1–3 y código Critical/High', () => {
    const items = itemsFor(D.repositories[withL4.slug])
    const s = selectCritical(defaultSelection(items), items)
    items.deps.forEach((x) => expect(!!s[x.id]).toBe(x.severity === 'CRITICAL' || x.severity === 'HIGH'))
    items.l4.forEach((x) => expect(s[x.id]).toBe(false))
    items.secrets.forEach((x) => expect(s[x.id]).toBe(false))
  })
})

import { describe, expect, it } from 'vitest'
import { EMPTY_ITEMS } from '../domain/items'
import { initialState, reducer } from './store'

const mem = (m: Record<string, string>) => ({ getItem: (k: string) => m[k] ?? null })

describe('initialState', () => {
  it('lee tema y QA del storage', () => {
    const s = initialState(mem({ 'rb-theme': 'dark', 'rb-qa-v2': '{"a:0":{"by":"x","at":"y"}}' }))
    expect(s.theme).toBe('dark')
    expect(s.qa['a:0'].by).toBe('x')
  })
  it('storage vacío, corrupto o que lanza → tema claro', () => {
    expect(initialState(mem({})).theme).toBe('light')
    expect(initialState(mem({ 'rb-qa-v2': '{' })).qa).toEqual({})
    const throwing = {
      getItem: () => {
        throw new Error('denied')
      },
    }
    expect(initialState(throwing).theme).toBe('light')
    expect(initialState(null).theme).toBe('light')
  })
})

describe('reducer', () => {
  const s0 = initialState(null)
  it('orden: texto asc, números desc, segundo click invierte', () => {
    const a = reducer(s0, { type: 'portfolio/sort', key: 'slug', textual: true })
    expect(a.portfolio).toMatchObject({ sortK: 'slug', sortD: 1 })
    const b = reducer(a, { type: 'portfolio/sort', key: 'dv', textual: false })
    expect(b.portfolio).toMatchObject({ sortK: 'dv', sortD: -1 })
    const c = reducer(b, { type: 'portfolio/sort', key: 'dv', textual: false })
    expect(c.portfolio.sortD).toBe(1)
  })
  it('sel/update parte de la selección por defecto', () => {
    const s = reducer(s0, { type: 'sel/update', slug: 'x', items: EMPTY_ITEMS, fn: (sel) => ({ ...sel, a: true }) })
    expect(s.sel.x).toEqual({ a: true })
  })
  it('fases: start, tick, done', () => {
    const snap = { units: 'u', t: 1, c: 1, fixes: 1 }
    let s = reducer(s0, { type: 'phase/start', key: 'x:fixdeps', snap, msg: 'm0' })
    expect(s.phases['x:fixdeps']).toMatchObject({ run: true, pct: 0, msg: 'm0', snap })
    s = reducer(s, { type: 'phase/tick', key: 'x:fixdeps', pct: 50, msg: 'm1' })
    expect(s.phases['x:fixdeps'].pct).toBe(50)
    s = reducer(s, { type: 'phase/done', key: 'x:fixdeps' })
    expect(s.phases['x:fixdeps']).toMatchObject({ run: false, done: true, msg: 'commiteado · gate verde', snap })
  })
  it('theme y expand', () => {
    expect(reducer(s0, { type: 'theme/toggle' }).theme).toBe('dark')
    expect(reducer(s0, { type: 'open/expand', keys: ['a|n3', 'a|res'] }).open).toEqual({ 'a|n3': true, 'a|res': true })
  })
})

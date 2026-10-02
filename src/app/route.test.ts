import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { navigate, parseHash, resolveRoute, routeHash } from './route'
import { useHashRoute } from './useHashRoute'

describe('parseHash', () => {
  it('reconoce las 4 rutas', () => {
    expect(parseHash('#/dashboard')).toEqual({ name: 'dashboard' })
    expect(parseHash('#/repo/altair-core')).toEqual({ name: 'repo', slug: 'altair-core' })
    expect(parseHash('#/repo/a%20b')).toEqual({ name: 'repo', slug: 'a b' })
    expect(parseHash('#/remediados')).toEqual({ name: 'remediados' })
    expect(parseHash('#/tour')).toEqual({ name: 'tour' })
  })
  it('vacía o desconocida → Portfolio', () => {
    expect(parseHash('')).toEqual({ name: 'dashboard' })
    expect(parseHash('#/otra')).toEqual({ name: 'dashboard' })
    expect(parseHash('#/repo/%E0%A4%A')).toEqual({ name: 'dashboard' })
  })
  it('routeHash es la inversa', () => {
    for (const h of ['#/dashboard', '#/repo/x', '#/remediados', '#/tour']) expect(routeHash(parseHash(h))).toBe(h)
  })
})

describe('resolveRoute', () => {
  const has = (s: string) => s === 'existe'
  it('slug inexistente → Portfolio', () => {
    expect(resolveRoute({ name: 'repo', slug: 'no-existe' }, has)).toEqual({ name: 'dashboard' })
    expect(resolveRoute({ name: 'repo', slug: 'existe' }, has)).toEqual({ name: 'repo', slug: 'existe' })
  })
  it('#/tour se muestra como Portfolio', () => {
    expect(resolveRoute({ name: 'tour' }, has)).toEqual({ name: 'dashboard' })
  })
  it('#/remediados existe en full y cae al Portfolio en review', () => {
    expect(resolveRoute({ name: 'remediados' }, has)).toEqual({ name: 'remediados' })
    expect(resolveRoute({ name: 'remediados' }, has, false)).toEqual({ name: 'remediados' })
    expect(resolveRoute({ name: 'remediados' }, has, true)).toEqual({ name: 'dashboard' })
    expect(resolveRoute({ name: 'repo', slug: 'existe' }, has, true)).toEqual({ name: 'repo', slug: 'existe' })
  })
})

describe('useHashRoute', () => {
  afterEach(() => {
    location.hash = ''
  })
  it('reacciona a hashchange', async () => {
    location.hash = '#/dashboard'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current).toEqual({ name: 'dashboard' })
    await act(async () => {
      navigate('#/repo/abc')
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(result.current).toEqual({ name: 'repo', slug: 'abc' })
  })
})

import { afterEach, describe, expect, it, vi } from 'vitest'
import { editionFrom } from './edition'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('edition', () => {
  it('sólo «review» activa la edición review', () => {
    expect(editionFrom('review')).toBe('review')
    expect(editionFrom('full')).toBe('full')
    expect(editionFrom('')).toBe('full')
    expect(editionFrom(undefined)).toBe('full')
    expect(editionFrom('Review')).toBe('full')
  })

  it('toma VITE_EDITION del entorno de build', async () => {
    vi.stubEnv('VITE_EDITION', 'review')
    const m = await import('./edition')
    expect(m.EDITION).toBe('review')
    expect(m.READONLY).toBe(true)
  })

  it('sin VITE_EDITION es la edición full', async () => {
    vi.stubEnv('VITE_EDITION', '')
    const m = await import('./edition')
    expect(m.EDITION).toBe('full')
    expect(m.READONLY).toBe(false)
  })
})

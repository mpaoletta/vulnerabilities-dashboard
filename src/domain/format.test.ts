import { describe, expect, it } from 'vitest'
import { dec, donut, hash, n, phColor, sevBg, sevFg, sevLabel, t, typeBg, typeFg, usd } from './format'

describe('format', () => {
  it('n usa separador de miles es-AR', () => {
    expect(n(18451654)).toBe('18.451.654')
    expect(n(0)).toBe('0')
    expect(n(undefined)).toBe('0')
  })

  it('t formatea tiempos como el prototipo', () => {
    expect([0, 45, 1500, 5400, 90000].map(t)).toEqual(['—', '45s', '25m', '1h 30m', '25h'])
    expect(t(0.4)).toBe('—')
    expect(t(59.6)).toBe('1m')
    expect(t(3600 * 1234)).toBe('1.234h')
    expect(t(-5)).toBe('—')
  })

  it('usd con dos decimales y coma', () => {
    expect(usd(58.8)).toBe('USD 58,80')
    expect(usd(0)).toBe('USD 0,00')
    expect(usd(1234.5)).toBe('USD 1234,50')
  })

  it('dec reemplaza el punto decimal', () => {
    expect(dec(75.13)).toBe('75,13')
  })

  it('severidades y colores', () => {
    expect(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(sevLabel)).toEqual(['Critical', 'High', 'Medium', 'Low'])
    expect(sevLabel(undefined)).toBe('—')
    expect(sevBg('CRITICAL')).toBe('var(--bordo)')
    expect(sevBg('HIGH')).toBe('var(--red)')
    expect(sevBg('MEDIUM')).toBe('var(--amber)')
    expect(sevBg('LOW')).toBe('var(--line)')
    expect(sevFg('HIGH')).toBe('#FFFFFF')
    expect(sevFg('LOW')).toBe('var(--fg)')
  })

  it('tipo y fase', () => {
    expect([typeBg('A'), typeBg('B'), typeBg('N/A')]).toEqual(['var(--teal)', 'var(--red)', 'var(--line)'])
    expect([typeFg('A'), typeFg('N/A')]).toEqual(['#FFFFFF', 'var(--fg3)'])
    expect(phColor('not-applicable')).toBe('var(--line2)')
    expect(phColor('otro')).toBe('var(--line)')
  })

  it('donut y hash', () => {
    expect(donut(50, 'var(--teal)')).toBe('conic-gradient(var(--teal) 0deg 180deg, var(--line) 180deg 360deg)')
    expect(hash('abc')).toBe(96354)
  })
})

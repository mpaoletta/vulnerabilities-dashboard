import { describe, expect, it } from 'vitest'
import { lastRunText } from './lastRun'

describe('lastRunText', () => {
  it('sin corrida no muestra nada', () => {
    expect(lastRunText(null)).toBe('')
    expect(lastRunText(undefined)).toBe('')
  })

  it('corrida parcial con policy fail', () => {
    expect(lastRunText({ status: 'partial', exitCode: 1, fixed: 15, notFixed: 2 })).toBe(
      'última corrida: 15 corregidas · 2 sin corregir · parcial · policy gate no pasa',
    )
  })

  it('corrida completa omite lo no corregido y agrega la fecha', () => {
    const at = new Date(2026, 9, 6, 21, 56).toISOString()
    expect(lastRunText({ status: 'succeeded', exitCode: 0, completedAt: at, fixed: 4, notFixed: 0 })).toBe(
      'última corrida 06/10 21:56: 4 corregidas · completa',
    )
  })
})

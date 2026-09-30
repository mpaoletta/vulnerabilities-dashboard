import { describe, expect, it } from 'vitest'
import type { FixPhaseKey, FleetRepository, PhaseStatus } from '../data/types'
import { blockedBy, nextAfter, phaseStatus, progress, ringGradient, type PhaseRun } from './phases'

const row = (statuses: PhaseStatus[]) =>
  ({
    demoState: {
      stage: 'in-progress',
      phases: (['review', 'fixdeps', 'fixcode', 'fixsecrets'] as const).map((phase, i) => ({ phase, status: statuses[i] })),
    },
  }) as unknown as FleetRepository

const statusMap = (m: Record<FixPhaseKey, PhaseStatus>) => (k: FixPhaseKey) => m[k]
const run = (p: Partial<PhaseRun>): PhaseRun => ({ run: false, done: false, pct: 0, msg: '', snap: null, ...p })

describe('phaseStatus', () => {
  const r = row(['done', 'pending', 'pending', 'not-applicable'])
  it('sale de demoState si no hay ejecución', () => {
    expect(phaseStatus(r, 'fixdeps')).toBe('pending')
    expect(phaseStatus(r, 'fixsecrets')).toBe('not-applicable')
  })
  it('la ejecución en memoria manda', () => {
    expect(phaseStatus(r, 'fixdeps', run({ run: true }))).toBe('running')
    expect(phaseStatus(r, 'fixdeps', run({ done: true }))).toBe('done')
  })
  it('pending si no hay fila', () => {
    expect(phaseStatus(undefined, 'fixcode')).toBe('pending')
  })
})

describe('blockedBy / nextAfter', () => {
  it('fixcode queda bloqueada si fixdeps está pending', () => {
    const s = statusMap({ fixdeps: 'pending', fixcode: 'pending', fixsecrets: 'pending' })
    expect(blockedBy(s, 'fixdeps')).toBeNull()
    expect(blockedBy(s, 'fixcode')).toBe('fixdeps')
    expect(blockedBy(s, 'fixsecrets')).toBe('fixdeps')
  })
  it('not-applicable no bloquea', () => {
    const s = statusMap({ fixdeps: 'not-applicable', fixcode: 'done', fixsecrets: 'pending' })
    expect(blockedBy(s, 'fixsecrets')).toBeNull()
  })
  it('running bloquea', () => {
    const s = statusMap({ fixdeps: 'running', fixcode: 'pending', fixsecrets: 'pending' })
    expect(blockedBy(s, 'fixcode')).toBe('fixdeps')
  })
  it('nextAfter salta las no pendientes', () => {
    const s = statusMap({ fixdeps: 'done', fixcode: 'not-applicable', fixsecrets: 'pending' })
    expect(nextAfter(s, 'fixdeps')).toBe('fixsecrets')
    expect(nextAfter(s, 'fixsecrets')).toBeNull()
  })
})

describe('progress', () => {
  it('67% con una fase no aplicable', () => {
    const p = progress(row(['done', 'done', 'pending', 'not-applicable']).demoState.phases)
    expect(Math.round(p * 100)).toBe(67)
  })
  it('running pesa 0.5', () => {
    expect(progress([{ status: 'done' }, { status: 'running' }])).toBe(0.75)
  })
  it('todo no aplica = 100%', () => {
    expect(progress([{ status: 'not-applicable' }])).toBe(1)
  })
})

describe('ringGradient', () => {
  const phases = [{ status: 'done' }, { status: 'running' }, { status: 'pending' }, { status: 'not-applicable' }] as const
  it('segmentos de 84° con 6° de separación', () => {
    expect(ringGradient([...phases], false)).toBe(
      'conic-gradient(var(--teal) 0deg 84deg, transparent 84deg 90deg, transparent 90deg 174deg, transparent 174deg 180deg, ' +
        'var(--line) 180deg 264deg, transparent 264deg 270deg, var(--line2) 270deg 354deg, transparent 354deg 360deg)',
    )
  })
  it('la capa live sólo dibuja running', () => {
    const g = ringGradient([...phases], true)
    expect(g).toContain('var(--red) 90deg 174deg')
    expect(g).not.toContain('var(--teal)')
  })
})

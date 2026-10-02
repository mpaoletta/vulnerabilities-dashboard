// Controller de la ejecución de fases. Dos implementaciones detrás de `PhaseRunner`:
// - simulada (demo, port de `startPhase`): 10 ticks de 420 ms, snapshot al arrancar, una fase
//   por vez por repo y encadenado a 500 ms;
// - real (`meta.source === 'database'`, ver `jobRunner.ts`): encola un job en la API y refleja
//   su estado.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef } from 'react'
import type { Connection } from '../data/connection'
import type { Dataset, FixPhaseKey, RemediationJob } from '../data/types'
import { estimate } from '../domain/estimate'
import { itemsFor } from '../domain/items'
import { blockedBy, nextAfter, ORDER, phaseKey, phaseStatus } from '../domain/phases'
import { useJobRunner } from './jobRunner'
import { selectionFor, type Store } from './store'

export const TICK_MS = 420
export const TICKS = 10
export const CHAIN_DELAY_MS = 500

/** Lo que sólo tiene el runner real (jobs de la API). */
export interface RealRunner {
  /** Por qué no se puede ejecutar `phases` en el repo (`null` = se puede). */
  blockReason: (slug: string, phases: FixPhaseKey[]) => string | null
  /** Último job conocido del repo (activo o terminado en esta sesión). */
  job: (slug: string) => RemediationJob | null
  /** Error del último intento de crear/cancelar un job. */
  error: (slug: string) => string | null
  cancel: (slug: string) => void
  /** Al abrir el repo: carga scope de la key y workers, y retoma su job activo. */
  watch: (slug: string) => void
}

export interface PhaseRunner {
  start: (slug: string, key: FixPhaseKey, chain?: boolean) => void
  /** Arranca la primera fase pendiente y encadena las siguientes. */
  runAll: (slug: string) => void
  /** Presente sólo con un portfolio real. */
  real?: RealRunner
}

export const PhaseRunnerContext = createContext<PhaseRunner | null>(null)

export function usePhaseRunnerContext(): PhaseRunner {
  const r = useContext(PhaseRunnerContext)
  if (!r) throw new Error('usePhaseRunnerContext() fuera del provider')
  return r
}

/** El runner que corresponde a la fuente: real con un portfolio, simulado en la demo. */
export function usePhaseRunner(store: Store, data: Dataset, connection: Connection | null = null): PhaseRunner {
  const simulated = useSimulatedRunner(store, data)
  const real = useJobRunner(store, data, data.meta.source === 'database' ? connection : null)
  return data.meta.source === 'database' && connection ? real : simulated
}

export function useSimulatedRunner(store: Store, data: Dataset): PhaseRunner {
  const intervals = useRef(new Map<string, ReturnType<typeof setInterval>>())
  const timeouts = useRef(new Set<ReturnType<typeof setTimeout>>())
  const chained = useRef(new Set<string>())
  const { dispatch, get } = store

  useEffect(() => {
    const iv = intervals.current
    const to = timeouts.current
    return () => {
      iv.forEach((id) => clearInterval(id))
      iv.clear()
      to.forEach((id) => clearTimeout(id))
      to.clear()
    }
  }, [])

  const start = useCallback(
    function start(slug: string, key: FixPhaseKey, chain = false): void {
      const row = data.fleet.repositories.find((r) => r.slug === slug)
      const detail = data.repositories[slug]
      if (!row || !detail) return
      const state = get()
      const k = phaseKey(slug, key)
      const cur = state.phases[k]
      if (cur?.run || cur?.done || intervals.current.has(k)) return
      const statusOf = (p: FixPhaseKey) => phaseStatus(row, p, state.phases[phaseKey(slug, p)])
      if (blockedBy(statusOf, key)) return
      if (ORDER.some((p) => state.phases[phaseKey(slug, p)]?.run || intervals.current.has(phaseKey(slug, p)))) return
      if (chain) chained.current.add(slug)

      const items = itemsFor(detail)
      const est = estimate(row, items, data.meta.estimationModel, selectionFor(state, slug, items))
      const p = est.ph[ORDER.indexOf(key) + 1]
      if (!p.t) return
      const labels = {
        fixdeps: est.depSel.slice(0, 4).map((d, i) => 'step ' + (i + 1) + '/' + est.depSel.length + ' — ' + d.package),
        fixcode: Array.from(new Set(est.codeSel.map((c) => c.file.split('/').pop()!))).slice(0, 4),
        fixsecrets: est.secTypes
          .slice(0, 3)
          .map((x) => 'triage ' + x)
          .concat(['reescritura de ' + est.secFiles.length + ' archivos']),
      }[key].concat(['commit + gate verde'])

      dispatch({ type: 'phase/start', key: k, snap: { units: p.units, t: p.t, c: p.c, fixes: p.fixes }, msg: labels[0] })
      let i = 0
      const id = setInterval(() => {
        i++
        dispatch({ type: 'phase/tick', key: k, pct: Math.min(100, i * 10), msg: labels[Math.min(labels.length - 1, Math.floor(i / 2))] })
        if (i < TICKS) return
        clearInterval(id)
        intervals.current.delete(k)
        dispatch({ type: 'phase/done', key: k })
        if (!chained.current.has(slug)) return
        // la fase actual ya está hecha aunque el estado todavía no se haya renderizado
        const after = get()
        const nx = nextAfter((q) => (q === key ? 'done' : phaseStatus(row, q, after.phases[phaseKey(slug, q)])), key)
        if (!nx) {
          chained.current.delete(slug)
          return
        }
        const to = setTimeout(() => {
          timeouts.current.delete(to)
          start(slug, nx, true)
        }, CHAIN_DELAY_MS)
        timeouts.current.add(to)
      }, TICK_MS)
      intervals.current.set(k, id)
    },
    [data, dispatch, get],
  )

  const runAll = useCallback(
    (slug: string) => {
      const row = data.fleet.repositories.find((r) => r.slug === slug)
      const state = get()
      const first = ORDER.find((k) => phaseStatus(row, k, state.phases[phaseKey(slug, k)]) === 'pending')
      if (first) start(slug, first, true)
    },
    [data, get, start],
  )

  return useMemo(() => ({ start, runAll }), [start, runAll])
}

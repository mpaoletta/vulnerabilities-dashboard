// Runner real (`meta.source === 'database'`): «Ejecutar» encola un job de remediación en la API
// con la selección actual, y el estado del job (polling cada 3 s) se refleja en las tarjetas con
// las mismas acciones del store que usa la simulación (`phase/start|tick|done|fail|clear`).
// La API nunca ejecuta nada: un worker del orchestrator toma el job; los cambios quedan
// commiteados en el clone local, sin push.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Connection } from '../data/connection'
import { useDatasetReload } from '../data/context'
import {
  cancelJob,
  createJob,
  failureText,
  getJob,
  getKeyInfo,
  getLatestJob,
  isActive,
  listWorkers,
  unresolvedItems,
} from '../data/jobs'
import { ApiError } from '../data/source'
import type { Dataset, FixPhaseKey, JobProgress, KeyInfo, RemediationJob, WorkerInfo } from '../data/types'
import { estimate } from '../domain/estimate'
import { itemsFor } from '../domain/items'
import { jobBody, jobSelection } from '../domain/jobSelection'
import { ORDER, phaseKey } from '../domain/phases'
import type { PhaseRunner, RealRunner } from './phaseRunner'
import { selectionFor, type Store } from './store'

export const POLL_MS = 3000

export const NO_WORKER_MSG = 'ningún worker conectado tiene este repo clonado'
export const LOCAL_ONLY_MSG = 'Los cambios quedan commiteados en el clone local; no se pushean'

/** Estimación, selección traducida y snapshot de una fase, con el estado actual del store. */
function planFor(data: Dataset, state: Store['state'], slug: string) {
  const row = data.fleet.repositories.find((r) => r.slug === slug)
  const detail = data.repositories[slug]
  if (!row || !detail) return null
  const items = itemsFor(detail)
  const sel = selectionFor(state, slug, items)
  const est = estimate(row, items, data.meta.estimationModel, sel)
  const bySel = jobSelection(items, sel, detail, { code: est.codeHidden > 0, secrets: est.secHiddenFiles > 0 })
  const snap = (key: FixPhaseKey) => {
    const p = est.ph[ORDER.indexOf(key) + 1]
    return { units: p.units, t: p.t, c: p.c, fixes: p.fixes }
  }
  return { bySel, snap }
}

const finishedOk = (job: RemediationJob, p: FixPhaseKey) => {
  const r = job.phaseResults?.[p]
  return !!r && (r.exitCode === 0 || r.exitCode === 1)
}

/** Resultado de una fase terminada: las salteadas no son correcciones, así que «completado» sólo
 * cuando no hubo ninguna, y el % es el de unidades corregidas. */
export function finishedOutcome(prog: JobProgress | undefined): { msg: string; label?: string; pct: number } {
  const done = prog?.done ?? 0
  const skipped = prog?.skipped ?? 0
  const pct = prog && prog.total ? Math.min(100, Math.round((done / prog.total) * 100)) : 100
  if (!skipped) return { msg: 'commiteado en el clone local', pct }
  if (!done) return { msg: 'nada commiteado · el motivo de cada una está en el ledger (skipped/)', label: skipped + ' salteadas, 0 corregidas', pct }
  return { msg: done + ' corregidas · commiteadas en el clone local', label: skipped + ' salteadas, ' + done + ' corregidas', pct }
}

/** Texto de la tarjeta para una fase pendiente dentro de un job todavía activo. */
function waitingMsg(job: RemediationJob): string {
  if (job.status === 'queued') return job.eligibleWorkers === 0 ? 'en cola — ' + NO_WORKER_MSG : 'en cola'
  if (job.status === 'claimed') return 'tomado por ' + (job.hostname || job.workerId || 'un worker')
  return 'esperando la fase anterior'
}

/** Motivo de bloqueo de las fases mientras el repo tiene un review en curso. */
export const REVIEW_RUNNING_MSG = 'hay un review en curso: al terminar cambian las unidades a corregir'

export function useJobRunner(
  store: Store,
  data: Dataset,
  connection: Connection | null,
  /** Si el repo tiene un review en curso (lo lleva `reviewRunner`, no este runner). */
  reviewing?: (slug: string) => boolean,
): PhaseRunner {
  const { dispatch, get } = store
  const reload = useDatasetReload()
  const [jobs, setJobs] = useState<Record<string, RemediationJob | null>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null)
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const jobsRef = useRef(jobs)
  const workers = useRef<WorkerInfo[] | null>(null)
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>())
  const watched = useRef(new Set<string>())
  const keyLoaded = useRef(false)

  useEffect(() => {
    const t = timers.current
    return () => {
      t.forEach((id) => clearInterval(id))
      t.clear()
    }
  }, [])

  const setError = useCallback((slug: string, msg: string | null) => setErrors((e) => ({ ...e, [slug]: msg })), [])

  /** Refleja el job en las tarjetas de sus fases. */
  const apply = useCallback(
    (slug: string, job: RemediationJob) => {
      const plan = planFor(data, get(), slug)
      let failedShown = false
      for (const p of ORDER) {
        const k = phaseKey(slug, p)
        if (!job.phases.includes(p) || job.status === 'cancelled') {
          if (job.phases.includes(p)) dispatch({ type: 'phase/clear', key: k })
          continue
        }
        const prog = job.progress?.[p]
        const finished = (prog?.done ?? 0) + (prog?.skipped ?? 0)
        const pct = prog && prog.total ? Math.min(100, Math.round((finished / prog.total) * 100)) : 0
        const cur = get().phases[k]
        const startIfNeeded = (msg: string, label: string) => {
          if (!cur?.run && plan) dispatch({ type: 'phase/start', key: k, snap: cur?.snap || plan.snap(p), msg, label })
        }
        if (finishedOk(job, p) || ((job.status === 'succeeded' || job.status === 'partial') && !job.phaseResults?.[p])) {
          if (!cur?.run && plan && !cur?.snap) dispatch({ type: 'phase/start', key: k, snap: plan.snap(p), msg: '' })
          dispatch({ type: 'phase/done', key: k, ...finishedOutcome(prog) })
        } else if (job.status === 'failed') {
          if (failedShown) dispatch({ type: 'phase/clear', key: k })
          else dispatch({ type: 'phase/fail', key: k, msg: failureText(job) })
          failedShown = true
        } else if (job.status === 'running' && job.currentPhase === p) {
          const msg = prog ? finished + '/' + prog.total + ' unidades' : 'arrancando…'
          startIfNeeded(msg, 'en curso')
          dispatch({ type: 'phase/tick', key: k, pct, msg, label: 'en curso' })
        } else {
          const msg = waitingMsg(job)
          const label = job.status === 'queued' ? 'en cola' : 'en espera'
          startIfNeeded(msg, label)
          dispatch({ type: 'phase/tick', key: k, pct: 0, msg, label })
        }
      }
    },
    [data, dispatch, get],
  )

  const remember = useCallback((slug: string, job: RemediationJob | null) => {
    jobsRef.current = { ...jobsRef.current, [slug]: job }
    setJobs(jobsRef.current)
  }, [])

  const stopPolling = useCallback((slug: string) => {
    const id = timers.current.get(slug)
    if (id !== undefined) clearInterval(id)
    timers.current.delete(slug)
  }, [])

  const track = useCallback(
    (slug: string, job: RemediationJob) => {
      remember(slug, job)
      apply(slug, job)
      if (!isActive(job)) {
        stopPolling(slug)
        return
      }
      if (timers.current.has(slug) || !connection) return
      const c = connection
      const id = setInterval(() => {
        const current = jobsRef.current[slug]
        if (!current) return
        getJob(c, slug, current.id).then(
          (next) => {
            remember(slug, next)
            apply(slug, next)
            if (!isActive(next)) {
              stopPolling(slug)
              // las fases publicaron sus runs: el dataset del tenant cambió
              reload()
            }
          },
          () => {
            // error transitorio: se reintenta en el próximo tick
          },
        )
      }, POLL_MS)
      timers.current.set(slug, id)
    },
    [apply, connection, reload, remember, stopPolling],
  )

  const refreshWorkers = useCallback(async (): Promise<WorkerInfo[] | null> => {
    if (!connection) return null
    try {
      workers.current = await listWorkers(connection)
    } catch {
      // sin la lista no se puede avisar; se encola igual
    }
    return workers.current
  }, [connection])

  const watch = useCallback(
    (slug: string) => {
      if (!connection) return
      if (!keyLoaded.current) {
        keyLoaded.current = true
        getKeyInfo(connection).then(setKeyInfo, () => {
          keyLoaded.current = false
        })
      }
      void refreshWorkers()
      if (watched.current.has(slug)) return
      watched.current.add(slug)
      getLatestJob(connection, slug).then(
        (job) => {
          if (!job) return
          if (isActive(job)) return track(slug, job)
          if (job.status !== 'succeeded' && job.status !== 'partial') return
          // Un job terminado sólo explica las fases cuyo estado actual (API) sigue siendo su
          // resultado: tras un review nuevo esas fases vuelven a pendiente y el job ya no aplica.
          const row = data.fleet.repositories.find((r) => r.slug === slug)
          const current = job.phases.filter((p) => row?.demoState.phases.find((x) => x.phase === p)?.status === 'done')
          if (current.length) apply(slug, { ...job, phases: current })
        },
        () => watched.current.delete(slug),
      )
    },
    [apply, connection, data, refreshWorkers, track],
  )

  const blockReason = useCallback(
    (slug: string, phases: FixPhaseKey[]): string | null => {
      if (keyInfo?.scope === 'read') return 'la key es de sólo lectura'
      if (reviewing?.(slug)) return REVIEW_RUNNING_MSG
      const job = jobs[slug]
      if (isActive(job)) return job?.phases.includes('review') ? REVIEW_RUNNING_MSG : 'el repo ya tiene un job en curso'
      if (busy[slug]) return 'creando el job…'
      const plan = planFor(data, store.state, slug)
      if (!plan || !jobBody(phases, plan.bySel).phases.length) return 'no hay unidades seleccionadas'
      return null
    },
    [busy, data, jobs, keyInfo, reviewing, store.state],
  )

  const launch = useCallback(
    async (slug: string, phases: FixPhaseKey[]) => {
      if (!connection || blockReason(slug, phases)) return
      const plan = planFor(data, get(), slug)
      if (!plan) return
      const body = jobBody(phases, plan.bySel)
      setBusy((b) => ({ ...b, [slug]: true }))
      setError(slug, null)
      try {
        const ws = await refreshWorkers()
        const covered = !ws || ws.some((w) => w.online && w.repositories.includes(slug))
        if (!covered && !window.confirm(NO_WORKER_MSG[0].toUpperCase() + NO_WORKER_MSG.slice(1) + ': el job quedará en cola. ¿Encolarlo igual?')) return
        const job = await createJob(connection, slug, body)
        track(slug, job)
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) {
          const activeId = (err.detail as { activeJobId?: string } | undefined)?.activeJobId
          setError(slug, 'El repo ya tiene un job activo')
          if (activeId) getJob(connection, slug, activeId).then((j) => track(slug, j), () => {})
        } else {
          const unresolved = unresolvedItems(err)
          setError(
            slug,
            unresolved.length
              ? 'La API no encontró unidades pendientes para: ' + unresolved.join(', ')
              : err instanceof Error
                ? err.message
                : String(err),
          )
        }
      } finally {
        setBusy((b) => ({ ...b, [slug]: false }))
      }
    },
    [blockReason, connection, data, get, refreshWorkers, setError, track],
  )

  const cancel = useCallback(
    (slug: string) => {
      const job = jobsRef.current[slug]
      if (!connection || !job || job.status !== 'queued') return
      cancelJob(connection, slug, job.id).then(
        (next) => {
          setError(slug, null)
          track(slug, next)
        },
        (err: unknown) => setError(slug, err instanceof Error ? err.message : String(err)),
      )
    },
    [connection, setError, track],
  )

  const start = useCallback((slug: string, key: FixPhaseKey) => void launch(slug, [key]), [launch])
  const runAll = useCallback((slug: string) => void launch(slug, [...ORDER]), [launch])

  const real: RealRunner = useMemo(
    () => ({
      blockReason,
      job: (slug) => jobs[slug] ?? null,
      error: (slug) => errors[slug] ?? null,
      cancel,
      watch,
    }),
    [blockReason, cancel, errors, jobs, watch],
  )

  return useMemo(() => ({ start, runAll, real }), [start, runAll, real])
}

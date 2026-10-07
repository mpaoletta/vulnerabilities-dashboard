// Reviews disparados desde el dashboard (add-worker-triggered-review): la API encola un job
// `['review']` y lo ejecuta el worker que tiene el clone. Vive aparte de `jobRunner.ts` porque
// no depende de la selección ni de las tarjetas de fase: un repo sin review no tiene detalle en el
// dataset. Al terminar bien, recarga el dataset (el repo pasa a la flota) y el listado.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { Connection } from '../data/connection'
import { useDatasetReload } from '../data/context'
import {
  cancelJob,
  createReviewJob,
  failureText,
  getJob,
  getKeyInfo,
  isActive,
  listUnreviewed,
  listWorkers,
} from '../data/jobs'
import { ApiError } from '../data/source'
import type { KeyInfo, RemediationJob, UnreviewedRepository, WorkerInfo } from '../data/types'
import { NO_WORKER_MSG, POLL_MS } from './jobRunner'

export const REREVIEW_CONFIRM =
  'Re-ejecutar el review reemplaza el review vigente: la selección actual y las correcciones en cola dejan de valer. ¿Continuar?'

export interface ReviewRunner {
  /** Repos sin review (workers en línea ∪ registrados sin review). */
  items: UnreviewedRepository[]
  /** Último job de review conocido del repo (activo o terminado en esta sesión). */
  job: (slug: string) => RemediationJob | null
  error: (slug: string) => string | null
  /** Por qué no se puede disparar el review (`null` = se puede). */
  blockReason: (slug: string) => string | null
  launch: (slug: string) => void
  cancel: (slug: string) => void
  /** Relee el listado, los workers y la key. */
  refresh: () => void
}

export const ReviewRunnerContext = createContext<ReviewRunner | null>(null)

/** `null` en la demo y en la edición review. */
export function useReviewRunnerContext(): ReviewRunner | null {
  return useContext(ReviewRunnerContext)
}

/** Estado legible de un job de review. */
export function reviewStatusText(job: RemediationJob): string {
  switch (job.status) {
    case 'queued':
      return job.eligibleWorkers === 0 ? 'en cola — ' + NO_WORKER_MSG : 'en cola'
    case 'claimed':
      return 'tomado por ' + (job.hostname || job.workerId || 'un worker')
    case 'running':
      return 'review en curso' + (job.hostname ? ' en ' + job.hostname : '')
    case 'succeeded':
      return 'review terminado'
    case 'cancelled':
      return 'cancelado'
    default:
      return 'falló: ' + failureText(job)
  }
}

export function useReviewRunner(connection: Connection | null): ReviewRunner {
  const reload = useDatasetReload()
  const [items, setItems] = useState<UnreviewedRepository[]>([])
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null)
  const [workers, setWorkers] = useState<WorkerInfo[]>([])
  const [jobs, setJobs] = useState<Record<string, RemediationJob>>({})
  const [errors, setErrors] = useState<Record<string, string | null>>({})
  const [busy, setBusy] = useState<Record<string, boolean>>({})
  const timers = useRef(new Map<string, ReturnType<typeof setInterval>>())

  useEffect(() => {
    const t = timers.current
    return () => {
      t.forEach((id) => clearInterval(id))
      t.clear()
    }
  }, [])

  const setError = useCallback((slug: string, msg: string | null) => setErrors((e) => ({ ...e, [slug]: msg })), [])

  const refresh = useCallback(() => {
    if (!connection) return
    listUnreviewed(connection).then(setItems, () => {})
    listWorkers(connection).then(setWorkers, () => {})
    getKeyInfo(connection).then(setKeyInfo, () => {})
  }, [connection])

  const track = useCallback(
    (slug: string, job: RemediationJob) => {
      setJobs((j) => ({ ...j, [slug]: job }))
      if (!isActive(job) || !connection || timers.current.has(slug)) return
      const c = connection
      const id = setInterval(() => {
        getJob(c, slug, job.id).then(
          (next) => {
            setJobs((j) => ({ ...j, [slug]: next }))
            if (isActive(next)) return
            clearInterval(id)
            timers.current.delete(slug)
            if (next.status === 'failed') setError(slug, reviewStatusText(next))
            // el review publicado cambia el dataset (el repo entra a la flota) y el listado
            if (next.status === 'succeeded') reload()
            refresh()
          },
          () => {
            // error transitorio: se reintenta en el próximo tick
          },
        )
      }, POLL_MS)
      timers.current.set(slug, id)
    },
    [connection, refresh, reload, setError],
  )

  useEffect(() => {
    refresh()
  }, [refresh])

  // Retoma el seguimiento de los reviews activos que trae el listado.
  useEffect(() => {
    if (!connection) return
    for (const item of items) {
      const a = item.activeJob
      if (!a || jobs[item.slug]?.id === a.id || !a.phases.includes('review')) continue
      getJob(connection, item.slug, a.id).then((j) => track(item.slug, j), () => {})
    }
  }, [connection, items, jobs, track])

  const covered = useCallback(
    (slug: string) =>
      items.some((i) => i.slug === slug && i.workers.length > 0) ||
      workers.some((w) => w.online && w.repositories.includes(slug)),
    [items, workers],
  )

  const blockReason = useCallback(
    (slug: string): string | null => {
      if (keyInfo?.scope === 'read') return 'la key es de sólo lectura'
      const item = items.find((i) => i.slug === slug)
      if (isActive(jobs[slug]) || (item?.activeJob && isActive(item.activeJob as RemediationJob)))
        return 'el repo ya tiene un job en curso'
      if (busy[slug]) return 'creando el job…'
      if (!covered(slug)) return NO_WORKER_MSG
      return null
    },
    [busy, covered, items, jobs, keyInfo],
  )

  const launch = useCallback(
    async (slug: string) => {
      if (!connection || blockReason(slug)) return
      setBusy((b) => ({ ...b, [slug]: true }))
      setError(slug, null)
      try {
        track(slug, await createReviewJob(connection, slug))
        refresh()
      } catch (err) {
        if (err instanceof ApiError && err.status === 409) setError(slug, 'El repo ya tiene un job activo')
        else setError(slug, err instanceof Error ? err.message : String(err))
      } finally {
        setBusy((b) => ({ ...b, [slug]: false }))
      }
    },
    [blockReason, connection, refresh, setError, track],
  )

  const cancel = useCallback(
    (slug: string) => {
      const job = jobs[slug]
      if (!connection || !job || job.status !== 'queued') return
      cancelJob(connection, slug, job.id).then(
        (next) => {
          const id = timers.current.get(slug)
          if (id !== undefined) clearInterval(id)
          timers.current.delete(slug)
          setJobs((j) => ({ ...j, [slug]: next }))
          setError(slug, null)
          refresh()
        },
        (err: unknown) => setError(slug, err instanceof Error ? err.message : String(err)),
      )
    },
    [connection, jobs, refresh, setError],
  )

  return useMemo(
    () => ({
      items,
      job: (slug: string) => jobs[slug] ?? null,
      error: (slug: string) => errors[slug] ?? null,
      blockReason,
      launch: (slug: string) => void launch(slug),
      cancel,
      refresh,
    }),
    [blockReason, cancel, errors, items, jobs, launch, refresh],
  )
}

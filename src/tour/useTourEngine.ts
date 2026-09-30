// Controller de la guía (port de tourStart/tourGo/tourApply/tourBind): tick de 200 ms,
// autoplay a `seconds/2`, teclado, pausa por interacción en kiosco y re-medición del foco.
import { useEffect, useMemo, useRef } from 'react'
import { navigate } from '../app/route'
import type { Store, TourState } from '../app/store'
import type { Dataset } from '../data/types'
import { itemsFor } from '../domain/items'
import { selectCritical } from '../domain/selection'
import { drifted, place } from './placement'
import { buildTourSteps, stepSlug, type TourStep } from './steps'

export const TOUR_TICK_MS = 200
export const TARGET_RETRIES = 10
export const TARGET_RETRY_MS = 150
export const IDLE_RESUME_MS = 45000
export const START_GRACE_MS = 1500
export const CURSOR_HIDE_MS = 5000

export interface TourEngine {
  steps: TourStep[]
  start: (kiosk: boolean) => void
  exit: () => void
  next: () => void
  prev: () => void
  togglePause: () => void
}

const viewport = () => ({ w: window.innerWidth, h: window.innerHeight })

export function useTourEngine(store: Store, data: Dataset): TourEngine {
  const ctx = useRef({ store, data })
  useEffect(() => {
    ctx.current = { store, data }
  })

  const engine = useMemo(() => {
    const steps = buildTourSteps(data)
    const timeouts = new Set<ReturnType<typeof setTimeout>>()
    let tick: ReturnType<typeof setInterval> | null = null
    let cursorTimer: ReturnType<typeof setTimeout> | null = null
    let startedAt = 0
    let applyToken = 0
    // estado local sincrónico: el store se renderiza de forma asíncrona
    let T: TourState = ctx.current.store.get().tour

    const later = (fn: () => void, ms: number) => {
      const id = setTimeout(() => {
        timeouts.delete(id)
        fn()
      }, ms)
      timeouts.add(id)
    }
    const patch = (p: Partial<TourState>) => {
      T = { ...T, ...p }
      ctx.current.store.dispatch({ type: 'tour/patch', patch: p })
    }

    const measure = (step: TourStep) => {
      if (!step.target) return
      const el = document.querySelector(step.target)
      if (!el) return
      const r = el.getBoundingClientRect()
      patch(place(r, step, viewport(), T.kiosk))
    }

    const apply = (i: number, scroll: boolean) => {
      const step = steps[i]
      if (!step) return
      const token = ++applyToken
      const { store, data } = ctx.current
      if (step.route && step.route !== (location.hash || '#/dashboard')) navigate(step.route)
      if (step.tab) store.dispatch({ type: 'tab/set', tab: step.tab })
      if (step.expand?.length) {
        const slug = stepSlug(step)
        store.dispatch({ type: 'open/expand', keys: step.expand.map((k) => slug + '|' + k) })
      }
      if (step.selectCritical) {
        const slug = stepSlug(step)
        const items = itemsFor(data.repositories[slug])
        later(() => store.dispatch({ type: 'sel/update', slug, items, fn: (s) => selectCritical(s, items) }), 30)
      }
      if (step.plate) {
        patch({ spot: null, bubble: null })
        return
      }
      const find = (tries: number) => {
        if (token !== applyToken || !T.on) return
        const el = step.target ? document.querySelector(step.target) : null
        if (!el) {
          if (tries > 0) later(() => find(tries - 1), TARGET_RETRY_MS)
          else next()
          return
        }
        if (scroll) {
          try {
            el.scrollIntoView({ block: 'center', behavior: 'smooth' })
          } catch {
            // jsdom y navegadores viejos
          }
        }
        later(() => token === applyToken && measure(step), scroll ? 420 : 0)
      }
      find(TARGET_RETRIES)
    }

    const go = (i: number) => {
      const nx = (i + steps.length) % steps.length
      if (steps[nx].closing && !T.kiosk) {
        exit()
        return
      }
      patch({ i: nx, elapsed: 0 })
      apply(nx, true)
    }
    const next = () => go(T.i + 1)
    const prev = () => go(T.i - 1)
    const togglePause = () => patch({ paused: !T.paused, idleSince: null })

    const onTick = () => {
      if (!T.on) return
      const cur = steps[T.i]
      if (cur && !cur.plate && cur.target) {
        const el = document.querySelector(cur.target)
        if (el && drifted(T.spot, el.getBoundingClientRect(), cur, window.innerWidth)) measure(cur)
      }
      if (T.kiosk && T.idleSince && Date.now() - T.idleSince > IDLE_RESUME_MS && T.paused) {
        patch({ paused: false, idleSince: null })
        return
      }
      if (T.paused) return
      const el = Math.round((T.elapsed || 0) + 0.2)
      if (cur && el >= (cur.seconds || 10) / 2) next()
      else patch({ elapsed: (T.elapsed || 0) + 0.2 })
    }
    const onKey = (e: KeyboardEvent) => {
      if (!T.on) return
      if (e.key === 'Escape') exit()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
      else if (T.kiosk && Date.now() - startedAt > START_GRACE_MS) patch({ paused: true, idleSince: Date.now() })
    }
    const onMove = () => {
      document.documentElement.style.cursor = ''
      if (cursorTimer) clearTimeout(cursorTimer)
      if (T.kiosk) cursorTimer = setTimeout(() => (document.documentElement.style.cursor = 'none'), CURSOR_HIDE_MS)
    }
    const onInteract = (e: MouseEvent) => {
      if (!T.on || !T.kiosk || T.paused) return
      if (Date.now() - startedAt < START_GRACE_MS) return
      const target = e.target as Element | null
      if (target?.closest?.('[role="dialog"]')) return
      patch({ paused: true, idleSince: Date.now() })
    }
    const onResize = () => {
      const step = steps[T.i]
      if (T.on && step && !step.plate) measure(step)
    }

    const bind = () => {
      if (tick) return
      tick = setInterval(onTick, TOUR_TICK_MS)
      window.addEventListener('keydown', onKey)
      window.addEventListener('mousemove', onMove)
      window.addEventListener('click', onInteract)
      window.addEventListener('resize', onResize)
      window.addEventListener('scroll', onResize, true)
      onMove()
    }
    const unbind = () => {
      if (!tick) return
      clearInterval(tick)
      tick = null
      if (cursorTimer) clearTimeout(cursorTimer)
      cursorTimer = null
      document.documentElement.style.cursor = ''
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('click', onInteract)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('scroll', onResize, true)
    }

    const start = (kiosk: boolean) => {
      startedAt = Date.now()
      patch({ on: true, kiosk, i: 0, paused: !kiosk, elapsed: 0, idleSince: null, spot: null, bubble: null })
      apply(0, true)
      bind()
    }
    function exit() {
      applyToken++
      patch({ on: false, kiosk: false, paused: true, spot: null, bubble: null, idleSince: null })
      unbind()
    }
    const dispose = () => {
      applyToken++
      unbind()
      timeouts.forEach((id) => clearTimeout(id))
      timeouts.clear()
    }

    return { steps, start, exit, next, prev, togglePause, dispose }
  }, [data])

  useEffect(() => () => engine.dispose(), [engine])

  return engine
}

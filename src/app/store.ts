// Estado de la app (handoff §«Estado sugerido»): un reducer puro con los slices
// theme, portfolio, tab, sel, open, phases, qa y tour. Los efectos con tiempo viven
// en controllers (usePhaseRunner, useTourEngine) que despachan acciones.
import { createContext, useContext, type Dispatch } from 'react'
import type { QaMap } from '../domain/flows'
import type { Items } from '../domain/items'
import type { PhaseRun, PhaseSnapshot } from '../domain/phases'
import { defaultSelection, type Selection, type Tab } from '../domain/selection'

export type Theme = 'light' | 'dark'

export interface PortfolioState {
  q: string
  fType: string
  fSize: string
  fLang: string
  fStage: string
  sortK: string
  /** 1 ascendente, -1 descendente. */
  sortD: 1 | -1
}

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface TourState {
  on: boolean
  kiosk: boolean
  i: number
  paused: boolean
  elapsed: number
  spot: Rect | null
  bubble: { x: number; y: number; w: number } | null
  idleSince: number | null
}

export interface State {
  theme: Theme
  portfolio: PortfolioState
  tab: Tab
  sel: Record<string, Selection>
  open: Record<string, boolean>
  phases: Record<string, PhaseRun>
  qa: QaMap
  tour: TourState
}

export type Action =
  | { type: 'theme/toggle' }
  | { type: 'portfolio/set'; patch: Partial<PortfolioState> }
  | { type: 'portfolio/sort'; key: string; textual: boolean }
  | { type: 'tab/set'; tab: Tab }
  | { type: 'sel/update'; slug: string; items: Items; fn: (sel: Selection) => Selection }
  | { type: 'open/set'; key: string; value: boolean }
  | { type: 'open/expand'; keys: string[] }
  | { type: 'phase/start'; key: string; snap: PhaseSnapshot; msg: string; label?: string }
  | { type: 'phase/tick'; key: string; pct: number; msg: string; label?: string }
  | { type: 'phase/done'; key: string; msg?: string; label?: string }
  | { type: 'phase/fail'; key: string; msg: string }
  | { type: 'phase/clear'; key: string }
  | { type: 'qa/set'; qa: QaMap }
  | { type: 'tour/patch'; patch: Partial<TourState> }

export const TOUR_OFF: TourState = {
  on: false,
  kiosk: false,
  i: 0,
  paused: false,
  elapsed: 0,
  spot: null,
  bubble: null,
  idleSince: null,
}

export const THEME_KEY = 'rb-theme'
export const QA_KEY = 'rb-qa-v2'

export function initialState(storage: Pick<Storage, 'getItem'> | null = safeStorage()): State {
  let qa: QaMap = {}
  let theme: Theme = 'light'
  try {
    if (storage) {
      qa = JSON.parse(storage.getItem(QA_KEY) || '{}') as QaMap
      theme = storage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
    }
  } catch {
    qa = {}
  }
  return {
    theme,
    portfolio: { q: '', fType: 'todos', fSize: 'todos', fLang: 'todos', fStage: 'todos', sortK: 'linesOfCode', sortD: -1 },
    tab: 'deps',
    sel: {},
    open: {},
    phases: {},
    qa,
    tour: TOUR_OFF,
  }
}

/** `localStorage` puede lanzar al accederlo (modo privado, políticas). */
export function safeStorage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

export function persist(key: string, value: string): void {
  try {
    safeStorage()?.setItem(key, value)
  } catch {
    // sin persistencia: la app sigue funcionando en memoria
  }
}

const defaults = new WeakMap<Items, Selection>()

/** Selección del repo, o la selección por defecto (estable por repo) si todavía no se tocó. */
export function selectionFor(state: State, slug: string, items: Items): Selection {
  const own = state.sel[slug]
  if (own) return own
  let d = defaults.get(items)
  if (!d) {
    d = defaultSelection(items)
    defaults.set(items, d)
  }
  return d
}

const EMPTY_RUN: PhaseRun = { run: false, done: false, pct: 0, msg: '', snap: null }

function patchPhase(state: State, key: string, patch: Partial<PhaseRun>): State {
  return { ...state, phases: { ...state.phases, [key]: { ...(state.phases[key] || EMPTY_RUN), ...patch } } }
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'theme/toggle':
      return { ...state, theme: state.theme === 'dark' ? 'light' : 'dark' }
    case 'portfolio/set':
      return { ...state, portfolio: { ...state.portfolio, ...action.patch } }
    case 'portfolio/sort': {
      const p = state.portfolio
      const sortD = p.sortK === action.key ? (-p.sortD as 1 | -1) : action.textual ? 1 : -1
      return { ...state, portfolio: { ...p, sortK: action.key, sortD } }
    }
    case 'tab/set':
      return state.tab === action.tab ? state : { ...state, tab: action.tab }
    case 'sel/update': {
      const base = selectionFor(state, action.slug, action.items)
      return { ...state, sel: { ...state.sel, [action.slug]: action.fn(base) } }
    }
    case 'open/set':
      return { ...state, open: { ...state.open, [action.key]: action.value } }
    case 'open/expand': {
      const open = { ...state.open }
      action.keys.forEach((k) => (open[k] = true))
      return { ...state, open }
    }
    case 'phase/start':
      return patchPhase(state, action.key, {
        run: true,
        done: false,
        failed: false,
        pct: 0,
        msg: action.msg,
        snap: action.snap,
        label: action.label,
      })
    case 'phase/tick':
      return patchPhase(state, action.key, { pct: action.pct, msg: action.msg, label: action.label })
    case 'phase/done':
      return patchPhase(state, action.key, {
        run: false,
        done: true,
        failed: false,
        pct: 100,
        msg: action.msg ?? 'commiteado · gate verde',
        label: action.label,
      })
    case 'phase/fail':
      return patchPhase(state, action.key, { run: false, done: false, failed: true, msg: action.msg, label: 'falló' })
    case 'phase/clear': {
      if (!(action.key in state.phases)) return state
      const phases = { ...state.phases }
      delete phases[action.key]
      return { ...state, phases }
    }
    case 'qa/set':
      return { ...state, qa: action.qa }
    case 'tour/patch':
      return { ...state, tour: { ...state.tour, ...action.patch } }
  }
}

export interface Store {
  state: State
  dispatch: Dispatch<Action>
  /** Estado más reciente, para callbacks de timers. */
  get: () => State
}

export const StoreContext = createContext<Store | null>(null)

export function useStore(): Store {
  const s = useContext(StoreContext)
  if (!s) throw new Error('useStore() fuera de <StoreProvider>')
  return s
}

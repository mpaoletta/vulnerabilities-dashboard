import { useEffect, useLayoutEffect, useMemo, useReducer, useRef, type ReactNode } from 'react'
import { initialState, persist, QA_KEY, reducer, StoreContext, THEME_KEY, type State } from './store'

export function StoreProvider({ children, init }: { children: ReactNode; init?: State }) {
  const [state, dispatch] = useReducer(reducer, init, (i) => i || initialState())
  const ref = useRef(state)
  useLayoutEffect(() => {
    ref.current = state
  }, [state])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', state.theme)
    persist(THEME_KEY, state.theme)
  }, [state.theme])

  const qaLoaded = useRef(state.qa)
  useEffect(() => {
    if (state.qa === qaLoaded.current) return
    persist(QA_KEY, JSON.stringify(state.qa))
  }, [state.qa])

  const store = useMemo(() => ({ state, dispatch, get: () => ref.current }), [state])
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>
}

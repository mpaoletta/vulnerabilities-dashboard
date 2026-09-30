import { useEffect } from 'react'
import { useDataset } from '../data/context'
import { DatasetProvider } from '../data/DatasetProvider'
import type { Dataset } from '../data/types'
import { TourOverlay } from '../tour/TourOverlay'
import { useTourEngine } from '../tour/useTourEngine'
import { PortfolioView } from '../views/portfolio/PortfolioView'
import { ProjectView } from '../views/project/ProjectView'
import { RemediatedView } from '../views/remediated/RemediatedView'
import { Header } from './Header'
import { PhaseRunnerContext, usePhaseRunner } from './phaseRunner'
import { navigate, resolveRoute } from './route'
import { useStore, type State } from './store'
import { StoreProvider } from './StoreProvider'
import { useHashRoute } from './useHashRoute'

/** Demora del deep link `#/tour`, como en el prototipo. */
export const TOUR_DEEPLINK_DELAY_MS = 400

function Shell() {
  const data = useDataset()
  const store = useStore()
  const { state, dispatch } = store
  const raw = useHashRoute()
  const route = resolveRoute(raw, (s) => !!data.repositories[s])
  const runner = usePhaseRunner(store, data)
  const tour = useTourEngine(store, data)

  useEffect(() => {
    if ((location.hash || '').indexOf('#/tour') !== 0) return
    const id = setTimeout(() => {
      navigate('#/dashboard')
      tour.start(true)
    }, TOUR_DEEPLINK_DELAY_MS)
    return () => clearTimeout(id)
  }, [tour])

  return (
    <PhaseRunnerContext.Provider value={runner}>
      <Header
        repositoryCount={data.fleet.repositoryCount}
        route={route}
        theme={state.theme}
        onToggleTheme={() => dispatch({ type: 'theme/toggle' })}
        onStartGuide={() => tour.start(false)}
        onStartKiosk={() => tour.start(true)}
      />
      {route.name === 'repo' ? (
        <ProjectView key={route.slug} slug={route.slug} />
      ) : route.name === 'remediados' ? (
        <RemediatedView />
      ) : (
        <PortfolioView />
      )}
      <TourOverlay tour={state.tour} engine={tour} />
    </PhaseRunnerContext.Provider>
  )
}

interface AppProps {
  /** Para tests: loader y estado inicial inyectables. */
  load?: () => Promise<Dataset>
  init?: State
}

export default function App({ load, init }: AppProps) {
  return (
    <StoreProvider init={init}>
      <DatasetProvider load={load}>
        <Shell />
      </DatasetProvider>
    </StoreProvider>
  )
}

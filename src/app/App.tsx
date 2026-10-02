import { useEffect, useState, type ReactNode } from 'react'
import { connectionId, useConnection, type Connection } from '../data/connection'
import { useDataset } from '../data/context'
import { DatasetProvider } from '../data/DatasetProvider'
import type { Dataset } from '../data/types'
import { TourOverlay } from '../tour/TourOverlay'
import { useTourEngine } from '../tour/useTourEngine'
import { PortfolioView } from '../views/portfolio/PortfolioView'
import { ProjectView } from '../views/project/ProjectView'
import { RemediatedView } from '../views/remediated/RemediatedView'
import { ConnectionDialog } from './ConnectionDialog'
import { READONLY } from './edition'
import { Header } from './Header'
import { PhaseRunnerContext, usePhaseRunner } from './phaseRunner'
import { navigate, resolveRoute } from './route'
import { useStore, type State } from './store'
import { StoreProvider } from './StoreProvider'
import { useHashRoute } from './useHashRoute'

/** Demora del deep link `#/tour`, como en el prototipo. */
export const TOUR_DEEPLINK_DELAY_MS = 400

/** Controller de ejecución de fases: sólo existe en la edición full. */
function ExecutionProvider({ children }: { children: ReactNode }) {
  const runner = usePhaseRunner(useStore(), useDataset(), useConnection())
  return <PhaseRunnerContext.Provider value={runner}>{children}</PhaseRunnerContext.Provider>
}

function Shell() {
  const data = useDataset()
  const store = useStore()
  const { state, dispatch } = store
  const raw = useHashRoute()
  const route = resolveRoute(raw, (s) => !!data.repositories[s])
  const tour = useTourEngine(store, data)
  const connection = useConnection()
  const [connectionOpen, setConnectionOpen] = useState(false)

  useEffect(() => {
    if ((location.hash || '').indexOf('#/tour') !== 0) return
    const id = setTimeout(() => {
      navigate('#/dashboard')
      tour.start(true)
    }, TOUR_DEEPLINK_DELAY_MS)
    return () => clearTimeout(id)
  }, [tour])

  const content = (
    <>
      <Header
        repositoryCount={data.fleet.repositoryCount}
        anonymized={!!data.meta.anonymized}
        sourceLabel={connection ? `Portfolio: ${connection.tenant}` : 'Fuente: demo'}
        onOpenConnection={() => setConnectionOpen(true)}
        route={route}
        theme={state.theme}
        onToggleTheme={() => dispatch({ type: 'theme/toggle' })}
        onStartGuide={() => tour.start(false)}
        onStartKiosk={() => tour.start(true)}
      />
      {route.name === 'repo' ? (
        <ProjectView key={route.slug} slug={route.slug} />
      ) : !READONLY && route.name === 'remediados' ? (
        <RemediatedView />
      ) : (
        <PortfolioView />
      )}
      <TourOverlay tour={state.tour} engine={tour} />
      {connectionOpen && <ConnectionDialog current={connection} onClose={() => setConnectionOpen(false)} />}
    </>
  )
  return READONLY ? content : <ExecutionProvider>{content}</ExecutionProvider>
}

interface AppProps {
  /** Para tests: loader y estado inicial inyectables. */
  load?: (connection: Connection | null) => Promise<Dataset>
  init?: State
}

export default function App({ load, init }: AppProps) {
  const connection = useConnection()
  // Cambiar de fuente descarta la selección y las ejecuciones simuladas (store nuevo).
  return (
    <StoreProvider key={connectionId(connection)} init={init}>
      <DatasetProvider load={load} connection={connection}>
        <Shell />
      </DatasetProvider>
    </StoreProvider>
  )
}

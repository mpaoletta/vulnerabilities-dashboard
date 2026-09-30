import { useEffect, useState, type ReactNode } from 'react'
import { DatasetContext } from './context'
import { loadDataset } from './source'
import type { Dataset } from './types'
import styles from './DatasetProvider.module.css'

type LoadState = { status: 'loading' } | { status: 'error'; message: string } | { status: 'ready'; data: Dataset }

interface Props {
  children: ReactNode
  /** Permite inyectar el loader en los tests. */
  load?: () => Promise<Dataset>
}

export function DatasetProvider({ children, load = loadDataset }: Props) {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    load().then(
      (data) => alive && setState({ status: 'ready', data }),
      (err: unknown) => alive && setState({ status: 'error', message: err instanceof Error ? err.message : String(err) }),
    )
    return () => {
      alive = false
    }
  }, [load])

  if (state.status === 'loading') {
    return (
      <div className={styles.state} role="status">
        Cargando el portfolio…
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className={styles.state} role="alert">
        <b>No se pudieron cargar los datos.</b>
        <span>{state.message}</span>
      </div>
    )
  }
  return <DatasetContext.Provider value={state.data}>{children}</DatasetContext.Provider>
}

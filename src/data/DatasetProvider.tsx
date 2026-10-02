import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { connectionId, setConnection, type Connection } from './connection'
import { DatasetContext, DatasetReloadContext } from './context'
import { loadDataset } from './source'
import type { Dataset } from './types'
import styles from './DatasetProvider.module.css'

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; source: string; message: string }
  | { status: 'ready'; source: string; data: Dataset }

interface Props {
  children: ReactNode
  /** Fuente: `null` = demo, o un portfolio conectado. */
  connection?: Connection | null
  /** Permite inyectar el loader en los tests. */
  load?: (connection: Connection | null) => Promise<Dataset>
}

export function DatasetProvider({ children, connection = null, load = loadDataset }: Props) {
  const source = connectionId(connection)
  const [loaded, setLoaded] = useState<LoadState>({ status: 'loading' })
  // Cada `reload()` pide de nuevo el dataset; mientras tanto se siguen mostrando los datos actuales.
  const [version, setVersion] = useState(0)
  const reload = useCallback(() => setVersion((v) => v + 1), [])
  // Un resultado de otra fuente (antes de cambiar de conexión) cuenta como «cargando».
  const state: LoadState = loaded.status !== 'loading' && loaded.source === source ? loaded : { status: 'loading' }

  useEffect(() => {
    let alive = true
    load(connection).then(
      (data) => alive && setLoaded({ status: 'ready', source, data }),
      (err: unknown) => {
        if (!alive) return
        // Un fallo al recargar conserva los datos que ya se estaban mostrando.
        setLoaded((prev) =>
          version > 0 && prev.status === 'ready' && prev.source === source
            ? prev
            : { status: 'error', source, message: err instanceof Error ? err.message : String(err) },
        )
      },
    )
    return () => {
      alive = false
    }
  }, [load, connection, source, version])

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
        {connection && (
          <button type="button" className={styles.action} onClick={() => setConnection(null)}>
            Usar demo
          </button>
        )}
      </div>
    )
  }
  return (
    <DatasetReloadContext.Provider value={reload}>
      <DatasetContext.Provider value={state.data}>{children}</DatasetContext.Provider>
    </DatasetReloadContext.Provider>
  )
}

import { createContext, useContext } from 'react'
import type { Dataset } from './types'

export const DatasetContext = createContext<Dataset | null>(null)

export function useDataset(): Dataset {
  const data = useContext(DatasetContext)
  if (!data) throw new Error('useDataset() fuera de <DatasetProvider>')
  return data
}

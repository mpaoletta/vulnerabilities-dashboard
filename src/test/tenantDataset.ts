// Dataset de un portfolio real (`meta.source = database`) producido por la API a partir de los
// fixtures sintéticos del orchestrator (sin datos de clientes).
import type { Dataset } from '../data/types'
import raw from './tenant-dataset.json'

export function tenantDataset(): Dataset {
  return structuredClone(raw) as unknown as Dataset
}

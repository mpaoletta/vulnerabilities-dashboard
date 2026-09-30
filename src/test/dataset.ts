// Dataset real del handoff para los tests (se lee del disco, no pasa por el bundle).
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Dataset } from '../data/types'

let cached: Dataset | null = null

export function demoDataset(): Dataset {
  if (!cached) {
    const file = resolve(import.meta.dirname, '../../docs/design_handoff_remediacion_dashboard/data/demo-data.json')
    cached = JSON.parse(readFileSync(file, 'utf8')) as Dataset
  }
  return cached
}

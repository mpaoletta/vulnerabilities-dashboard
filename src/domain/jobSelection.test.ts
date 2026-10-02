import { describe, expect, it } from 'vitest'
import { tenantDataset } from '../test/tenantDataset'
import { itemsFor } from './items'
import { jobBody, jobSelection } from './jobSelection'
import { defaultSelection, setSel } from './selection'

const detail = () => tenantDataset().repositories['demo-api']

describe('jobSelection', () => {
  it('deps por {ecosystem, package}, sin nivel 4', () => {
    const it = itemsFor(detail())
    const s = jobSelection(it, defaultSelection(it), detail())
    expect(s.fixdeps).toEqual({
      mode: 'subset',
      packages: [
        { ecosystem: 'maven', package: 'org.example:core' },
        { ecosystem: 'maven', package: 'org.example:web' },
      ],
    })
  })

  it('código: un par archivo+severidad aunque haya varios hallazgos', () => {
    const it = itemsFor(detail())
    const s = jobSelection(it, defaultSelection(it), detail())
    expect(s.fixcode).toEqual({
      mode: 'subset',
      files: [
        { file: 'src/main/java/App.java', severity: 'HIGH' },
        { file: 'src/main/java/Http.java', severity: 'MEDIUM' },
      ],
    })
  })

  it('secretos por archivo', () => {
    const it = itemsFor(detail())
    const s = jobSelection(it, defaultSelection(it), detail())
    expect(s.fixsecrets && 'files' in s.fixsecrets ? s.fixsecrets.files.map((f) => f.file) : []).toContain('config/app.yml')
  })

  it('con el listado recortado y todo seleccionado manda mode all', () => {
    const d = detail()
    d.secrets.truncated = true
    d.sast.truncated = true
    const it = itemsFor(d)
    const s = jobSelection(it, defaultSelection(it), d)
    expect(s.fixsecrets).toEqual({ mode: 'all' })
    expect(s.fixcode).toEqual({ mode: 'all' })
  })

  it('recortado pero con selección parcial sigue siendo subset', () => {
    const d = detail()
    d.sast.truncated = true
    const it = itemsFor(d)
    const sel = setSel(defaultSelection(it), [it.code[0].id], false)
    expect(jobSelection(it, sel, d).fixcode?.mode).toBe('subset')
  })

  it('fase sin selección queda null y jobBody la descarta', () => {
    const it = itemsFor(detail())
    const sel = setSel(defaultSelection(it), it.code.map((c) => c.id), false)
    const s = jobSelection(it, sel, detail())
    expect(s.fixcode).toBeNull()
    const body = jobBody(['fixdeps', 'fixcode'], s)
    expect(body.phases).toEqual(['fixdeps'])
    expect(Object.keys(body.selection)).toEqual(['fixdeps'])
  })
})

// Port de `estimate()` del prototipo: estimación en vivo según la selección.
import type { EstimationModel, FleetRepository } from '../data/types'
import { n } from './format'
import type { CodeItem, DepItem, Items, SecretItem } from './items'
import type { Selection } from './selection'

export interface PhaseRow {
  name: 'review' | 'fixdeps' | 'fixcode' | 'fixsecrets'
  units: string
  /** Segundos. */
  t: number
  /** USD. */
  c: number
  fixes: number
}

export interface LiveEstimate {
  ph: [PhaseRow, PhaseRow, PhaseRow, PhaseRow]
  /** Segundos de fix (sin review). */
  total: number
  /** USD de fix (sin review). */
  cost: number
  depSel: DepItem[]
  l4Sel: DepItem[]
  codeSel: CodeItem[]
  secSel: SecretItem[]
  codeUnits: number
  codeHidden: number
  secTypeUnits: number
  secFileUnits: number
  secHiddenFiles: number
  secTypes: string[]
  secFiles: string[]
  l4: { t: number; c: number; fixes: number; n: number }
  fixes: number
  compile: number
}

export function estimate(row: FleetRepository, it: Items, M: EstimationModel, sel: Selection): LiveEstimate {
  const C = row.compileTimeSeconds || 0
  const O = M.phaseOverheadSeconds
  const UD = row.unitDetail || { sastFiles: 0, secretTypes: 0, secretFiles: 0 }

  // fixdeps: los updates de niveles 1-3 vienen completos, se cuentan uno a uno
  const depSel = it.deps.filter((d) => sel[d.id])
  let depT = 0
  let depC = 0
  depSel.forEach((d) => {
    if (d.requiresCodeChange) {
      depT += M.fixdeps.codeChangeSeconds + M.fixdeps.codeChangeCompileFactor * C
      depC += M.fixdeps.codeChangeUsd
    } else {
      depT += M.fixdeps.bumpSeconds + M.fixdeps.bumpCompileFactor * C
      depC += M.fixdeps.bumpUsd
    }
  })
  const l4Sel = it.l4.filter((d) => sel[d.id])
  let l4T = 0
  let l4C = 0
  l4Sel.forEach(() => {
    l4T += M.fixdeps.codeChangeSeconds + M.fixdeps.codeChangeCompileFactor * C
    l4C += M.fixdeps.codeChangeUsd
  })

  // fixcode y fixsecrets: la base es el total real del repo y sólo se descuenta
  // lo que el usuario deselecciona entre lo visible
  const codePairs: Record<string, { on: boolean; real: number }> = {}
  it.code.forEach((c) => {
    const k = c.fi + '|' + c.sev
    if (!codePairs[k]) codePairs[k] = { on: false, real: it.codeReal[k] || 0 }
    if (sel[c.id]) codePairs[k].on = true
  })
  const codeOff = Object.keys(codePairs).filter((k) => !codePairs[k].on)
  const codeUnits = Math.max(0, UD.sastFiles - codeOff.length)
  const codeHidden = Math.max(0, UD.sastFiles - Object.keys(codePairs).length)
  const codeFixes = Math.max(0, row.vulnerabilities.code - codeOff.reduce((a, k) => a + codePairs[k].real, 0))
  const codeT = codeUnits ? codeUnits * (M.fixcode.secondsPerFile + M.fixcode.compileFactor * C) + O : 0
  const codeC = codeUnits * M.fixcode.usdPerFile

  const secFileMap: Record<string, { on: boolean; real: number }> = {}
  const secTypeMap: Record<string, boolean> = {}
  it.secrets.forEach((k) => {
    if (!k.fp) {
      if (!secFileMap[k.fi]) secFileMap[k.fi] = { on: false, real: it.secretReal[k.fi] || 0 }
      if (sel[k.id]) secFileMap[k.fi].on = true
    }
    if (!secTypeMap[k.tipo]) secTypeMap[k.tipo] = false
    if (sel[k.id]) secTypeMap[k.tipo] = true
  })
  const secFilesOff = Object.keys(secFileMap).filter((f) => !secFileMap[f].on)
  const secTypesOff = Object.keys(secTypeMap).filter((x) => !secTypeMap[x])
  const secFileUnits = Math.max(0, UD.secretFiles - secFilesOff.length)
  const secTypeUnits = Math.max(0, UD.secretTypes - secTypesOff.length)
  const secHiddenFiles = Math.max(0, UD.secretFiles - Object.keys(secFileMap).length)
  const secFixes = Math.max(0, row.vulnerabilities.secretsActive - secFilesOff.reduce((a, f) => a + secFileMap[f].real, 0))
  const secT =
    secFileUnits || secTypeUnits
      ? secTypeUnits * M.fixsecrets.triageSecondsPerType + secFileUnits * (M.fixsecrets.secondsPerFile + M.fixsecrets.compileFactor * C) + O
      : 0
  const secC = secTypeUnits * M.fixsecrets.triageUsdPerType + secFileUnits * M.fixsecrets.usdPerFile

  const ph: LiveEstimate['ph'] = [
    { name: 'review', units: 'ejecutada', t: row.reviewSeconds || 0, c: row.reviewSeconds ? M.reviewUsd : 0, fixes: 0 },
    {
      name: 'fixdeps',
      units: depSel.length + ' de ' + it.deps.length + ' librerías',
      t: depSel.length ? depT + O : 0,
      c: depC,
      fixes: depSel.reduce((a, d) => a + (d.fixesCount || 0), 0),
    },
    {
      name: 'fixcode',
      units: n(codeUnits) + ' de ' + n(UD.sastFiles) + ' unidades (archivo × severidad)',
      t: codeT,
      c: codeC,
      fixes: codeFixes,
    },
    {
      name: 'fixsecrets',
      units: secTypeUnits + ' tipos · ' + n(secFileUnits) + ' de ' + n(UD.secretFiles) + ' archivos',
      t: secT,
      c: secC,
      fixes: secFixes,
    },
  ]
  return {
    ph,
    total: ph.slice(1).reduce((a, p) => a + p.t, 0),
    cost: ph.slice(1).reduce((a, p) => a + p.c, 0),
    depSel,
    l4Sel,
    codeSel: it.code.filter((c) => sel[c.id]),
    secSel: it.secrets.filter((k) => sel[k.id]),
    codeUnits,
    codeHidden,
    secTypeUnits,
    secFileUnits,
    secHiddenFiles,
    secTypes: Object.keys(secTypeMap).filter((x) => secTypeMap[x]),
    secFiles: Object.keys(secFileMap).filter((f) => secFileMap[f].on),
    l4: { t: l4Sel.length ? l4T + O : 0, c: l4C, fixes: l4Sel.reduce((a, d) => a + (d.fixesCount || 0), 0), n: l4Sel.length },
    fixes: ph[1].fixes + ph[2].fixes + ph[3].fixes,
    compile: C,
  }
}

// Traducción de la selección de la grilla (ids posicionales `d:`/`s:`/`k:`) al cuerpo de un job:
// la API resuelve contra las unidades del ledger, que son por librería (deps), por archivo y
// severidad (código) y por archivo (secretos). Los ids del dashboard nunca viajan.
import type { FixPhaseKey, JobPhaseSelection, JobSelection, RepositoryDetail, Severity } from '../data/types'
import type { Items } from './items'
import type { Selection } from './selection'

/** Si el detalle del repo no lista todo (recortes de la API o unidades fuera del detalle). */
export interface Hidden {
  code?: boolean
  secrets?: boolean
}

function codeTruncated(d: RepositoryDetail | undefined, hidden: Hidden): boolean {
  return !!hidden.code || !!d?.sast.truncated || !!d?.sast.files?.some((f) => f.truncated)
}

function secretsTruncated(d: RepositoryDetail | undefined, hidden: Hidden): boolean {
  return !!hidden.secrets || !!d?.secrets.truncated || !!d?.secrets.files?.some((f) => f.truncated)
}

/** La selección de cada fase, o `null` si la fase no tiene nada seleccionado. */
export function jobSelection(
  it: Items,
  sel: Selection,
  d: RepositoryDetail | undefined,
  hidden: Hidden = {},
): Record<FixPhaseKey, JobPhaseSelection | null> {
  // Dependencias: sólo niveles 1–3 (el nivel 4 nunca tiene unidad en el ledger).
  const seenPkg = new Set<string>()
  const packages: Array<{ ecosystem?: string; package: string }> = []
  for (const dep of it.deps) {
    if (!sel[dep.id]) continue
    const k = (dep.ecosystem ?? '') + '\u0000' + dep.package
    if (seenPkg.has(k)) continue
    seenPkg.add(k)
    packages.push(dep.ecosystem ? { ecosystem: dep.ecosystem, package: dep.package } : { package: dep.package })
  }

  // Código: un par archivo+severidad por unidad.
  const codeSel = it.code.filter((c) => sel[c.id])
  const seenCode = new Set<string>()
  const codeFiles: Array<{ file: string; severity: Severity }> = []
  for (const c of codeSel) {
    const k = c.file + '\u0000' + c.sev
    if (seenCode.has(k)) continue
    seenCode.add(k)
    codeFiles.push({ file: c.file, severity: c.sev })
  }
  const allCode = codeSel.length > 0 && codeSel.length === it.code.length

  // Secretos: por archivo; los falsos positivos no cuentan para «todo» (nunca se corrigen).
  const secretSel = it.secrets.filter((k) => sel[k.id])
  const files = Array.from(new Set(secretSel.map((k) => k.file))).map((file) => ({ file }))
  const activeSecrets = it.secrets.filter((k) => !k.fp)
  const allSecrets = secretSel.length > 0 && activeSecrets.every((k) => sel[k.id])

  return {
    fixdeps: packages.length ? { mode: 'subset', packages } : null,
    fixcode: !codeFiles.length
      ? null
      : allCode && codeTruncated(d, hidden)
        ? { mode: 'all' }
        : { mode: 'subset', files: codeFiles },
    fixsecrets: !files.length
      ? null
      : allSecrets && secretsTruncated(d, hidden)
        ? { mode: 'all' }
        : { mode: 'subset', files },
  }
}

/** Cuerpo del job para `phases`, descartando las que no tienen selección. */
export function jobBody(
  phases: FixPhaseKey[],
  bySel: Record<FixPhaseKey, JobPhaseSelection | null>,
): { phases: FixPhaseKey[]; selection: JobSelection } {
  const kept = phases.filter((p) => bySel[p])
  const selection: JobSelection = {}
  kept.forEach((p) => (selection[p] = bySel[p]!))
  return { phases: kept, selection }
}

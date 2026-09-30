// Formato de valores, portado 1:1 del prototipo (`n`, `t`, `usd`, `sevLabel` y colores).
import type { PhaseStatus, Severity } from '../data/types'

export function n(v: number | null | undefined): string {
  return (v || 0).toLocaleString('es-AR')
}

export function t(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  if (!s) return '—'
  if (s < 60) return s + 's'
  const m = Math.round(s / 60)
  if (m < 60) return m + 'm'
  const h = Math.floor(m / 60)
  return h >= 24 ? n(h) + 'h' : h + 'h ' + String(m % 60).padStart(2, '0') + 'm'
}

export function usd(v: number | null | undefined): string {
  return 'USD ' + (v || 0).toFixed(2).replace('.', ',')
}

/** Decimal con coma, tal cual viene (p. ej. `75.13` → «75,13»). */
export function dec(v: number): string {
  return String(v).replace('.', ',')
}

const SEV_LABEL: Record<Severity, string> = { CRITICAL: 'Critical', HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' }
export function sevLabel(s: string | null | undefined): string {
  return SEV_LABEL[s as Severity] || s || '—'
}

const SEV_BG: Record<Severity, string> = {
  CRITICAL: 'var(--bordo)',
  HIGH: 'var(--red)',
  MEDIUM: 'var(--amber)',
  LOW: 'var(--line)',
}
export function sevBg(s: string | null | undefined): string {
  return SEV_BG[s as Severity] || 'var(--line)'
}
export function sevFg(s: string | null | undefined): string {
  return s === 'MEDIUM' || s === 'LOW' || !s ? 'var(--fg)' : '#FFFFFF'
}

export function typeBg(type: string): string {
  return type === 'B' ? 'var(--red)' : type === 'A' ? 'var(--teal)' : 'var(--line)'
}
export function typeFg(type: string): string {
  return type === 'A' || type === 'B' ? '#FFFFFF' : 'var(--fg3)'
}

const PH_COLOR: Record<PhaseStatus, string> = {
  done: 'var(--teal)',
  running: 'var(--red)',
  pending: 'var(--line)',
  'not-applicable': 'var(--line2)',
}
export function phColor(st: string): string {
  return PH_COLOR[st as PhaseStatus] || 'var(--line)'
}

/** Donut de un solo valor: `pct` en 0–100. */
export function donut(pct: number, color: string): string {
  const deg = Math.round(pct * 3.6)
  return 'conic-gradient(' + color + ' 0deg ' + deg + 'deg, var(--line) ' + deg + 'deg 360deg)'
}

/** Hash estable del prototipo (número de PR simulado). */
export function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

// Geometría de la guía: port de `tourMeasure()`. Pura, sin DOM.
import type { Rect } from '../app/store'

export interface Viewport {
  w: number
  h: number
}

export interface TargetRect {
  left: number
  top: number
  width: number
  height: number
}

export interface Placement {
  spot: Rect
  bubble: { x: number; y: number; w: number }
}

export const DEFAULT_PAD = 8

export function bubbleSize(kiosk: boolean, vw: number) {
  return { bw: Math.min(kiosk ? 560 : 400, vw - 32), bh: kiosk ? 300 : 230 }
}

export function place(r: TargetRect, step: { pad?: number; clip?: number }, vp: Viewport, kiosk: boolean): Placement {
  const pad = step.pad !== undefined ? step.pad : DEFAULT_PAD
  const maxH = step.clip || Math.min(vp.h - 120, 620)
  const h = Math.min(r.height + pad * 2, maxH)
  const spot: Rect = { x: Math.max(4, r.left - pad), y: Math.max(4, r.top - pad), w: Math.min(r.width + pad * 2, vp.w - 8), h }
  spot.h = Math.max(60, Math.min(spot.h, vp.h - spot.y - 8))
  const { bw, bh } = bubbleSize(kiosk, vp.w)
  const gap = 18
  let bx = 0
  let by = 0
  const fits = () => {
    const below = vp.h - (spot.y + spot.h)
    const above = spot.y
    const right = vp.w - (spot.x + spot.w)
    const left = spot.x
    if (below > bh + gap) {
      by = spot.y + spot.h + gap
      bx = Math.min(Math.max(8, spot.x), vp.w - bw - 8)
      return true
    }
    if (above > bh + gap) {
      by = spot.y - bh - gap
      bx = Math.min(Math.max(8, spot.x), vp.w - bw - 8)
      return true
    }
    if (right > bw + gap) {
      bx = spot.x + spot.w + gap
      by = Math.min(Math.max(8, spot.y), vp.h - bh - 8)
      return true
    }
    if (left > bw + gap) {
      bx = spot.x - bw - gap
      by = Math.min(Math.max(8, spot.y), vp.h - bh - 8)
      return true
    }
    return false
  }
  if (!fits()) {
    // recortar el foco para que la burbuja nunca lo tape
    const maxW = vp.w - bw - gap * 2 - 16
    if (maxW > 220) spot.w = Math.min(spot.w, maxW)
    const maxSpotH = vp.h - bh - gap * 2 - 16
    if (spot.w > maxW && maxSpotH > 160) spot.h = Math.min(spot.h, maxSpotH)
    if (!fits()) {
      const topRoom = spot.y
      const botRoom = vp.h - (spot.y + spot.h)
      if (topRoom >= botRoom) {
        spot.h = Math.max(60, spot.h - (bh + gap - topRoom < 0 ? 0 : bh + gap - topRoom))
        by = 8
      } else {
        by = vp.h - bh - 8
        spot.h = Math.max(60, Math.min(spot.h, by - gap - spot.y))
      }
      bx = Math.min(Math.max(8, spot.x), vp.w - bw - 8)
    }
  }
  return { spot, bubble: { x: Math.max(8, bx), y: Math.max(8, by), w: bw } }
}

/** El tick re-mide si el target se movió más de 2px respecto del spotlight. */
export function drifted(spot: Rect | null, r: TargetRect, step: { pad?: number }, vw: number): boolean {
  const pad = step.pad !== undefined ? step.pad : DEFAULT_PAD
  return !spot || Math.abs(spot.y - Math.max(4, r.top - pad)) > 2 || Math.abs(spot.w - Math.min(r.width + pad * 2, vw - 8)) > 2
}

import { describe, expect, it } from 'vitest'
import { drifted, place } from './placement'

const vp = { w: 1440, h: 900 }

describe('place', () => {
  it('padding por defecto de 8px y burbuja debajo', () => {
    const p = place({ left: 100, top: 100, width: 300, height: 100 }, {}, vp, false)
    expect(p.spot).toEqual({ x: 92, y: 92, w: 316, h: 116 })
    expect(p.bubble).toEqual({ x: 92, y: 92 + 116 + 18, w: 400 })
  })

  it('sin espacio abajo → arriba, sin superponerse', () => {
    const p = place({ left: 100, top: 780, width: 300, height: 80 }, {}, vp, false)
    expect(p.bubble.y + 230).toBeLessThanOrEqual(p.spot.y)
  })

  it('sin espacio arriba ni abajo → a la derecha', () => {
    const p = place({ left: 20, top: 208, width: 400, height: 700 }, {}, vp, false)
    expect(p.bubble.x).toBeGreaterThanOrEqual(p.spot.x + p.spot.w)
  })

  it('clip limita el alto y nunca sale del viewport', () => {
    const p = place({ left: 0, top: 50, width: 1440, height: 3000 }, { clip: 260 }, vp, false)
    expect(p.spot.h).toBeLessThanOrEqual(260)
    expect(p.spot.x).toBeGreaterThanOrEqual(4)
    expect(p.spot.w).toBeLessThanOrEqual(vp.w - 8)
    expect(p.spot.y + p.spot.h).toBeLessThanOrEqual(vp.h - 8)
  })

  it('target a pantalla completa → se recorta el foco para no taparlo', () => {
    const p = place({ left: 0, top: 0, width: 1440, height: 900 }, {}, vp, false)
    const b = { x: p.bubble.x, y: p.bubble.y, w: p.bubble.w, h: 230 }
    const overlap =
      b.x < p.spot.x + p.spot.w && b.x + b.w > p.spot.x && b.y < p.spot.y + p.spot.h && b.y + b.h > p.spot.y
    expect(overlap).toBe(false)
  })

  it('kiosco usa burbuja de 560px', () => {
    expect(place({ left: 100, top: 100, width: 300, height: 100 }, {}, vp, true).bubble.w).toBe(560)
  })

  it('viewport angosto limita el ancho de la burbuja', () => {
    expect(place({ left: 10, top: 10, width: 200, height: 50 }, {}, { w: 360, h: 800 }, false).bubble.w).toBe(328)
  })
})

describe('drifted', () => {
  it('detecta movimientos de más de 2px', () => {
    const r = { left: 100, top: 100, width: 300, height: 100 }
    const spot = place(r, {}, vp, false).spot
    expect(drifted(spot, r, {}, vp.w)).toBe(false)
    expect(drifted(spot, { ...r, top: 110 }, {}, vp.w)).toBe(true)
    expect(drifted(null, r, {}, vp.w)).toBe(true)
  })
})

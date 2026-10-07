// Edición review (sólo lectura): mismo árbol que la full, sin las partes de ejecución.
// `edition` se mockea con un flag mutable para comparar ambas ediciones en el mismo archivo.
import { act, cleanup, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../test/renderApp'

const edition = vi.hoisted(() => ({ readonly: true }))

vi.mock('./edition', () => ({
  get EDITION() {
    return edition.readonly ? 'review' : 'full'
  },
  get READONLY() {
    return edition.readonly
  },
}))

const SLUG = 'vega-web'
const estimatePanel = () => document.querySelector('[data-tour="estimacion"]') as HTMLElement

beforeEach(() => {
  edition.readonly = true
})

afterEach(() => {
  vi.useRealTimers()
  location.hash = ''
})

describe('Edición review', () => {
  it('el header no tiene el link Remediados y conserva el resto', async () => {
    await renderApp()
    const nav = screen.getByRole('navigation')
    expect(within(nav).getAllByRole('link').map((a) => a.textContent)).toEqual(['Portfolio'])
    for (const name of ['Ver guía', 'Modo demo', 'Tema oscuro']) expect(screen.getByRole('button', { name })).toBeInTheDocument()
  })

  it('#/remediados muestra el Portfolio y no el checklist de QA', async () => {
    await renderApp('#/remediados')
    expect(document.querySelector('[data-tour="kpis"]')).not.toBeNull()
    expect(document.querySelector('[data-tour^="flows-"]')).toBeNull()
  })

  it('la vista Proyecto no tiene fases, franja de cierre ni botones de ejecución', async () => {
    await renderApp('#/repo/' + SLUG)
    expect(document.querySelector('[data-tour="fases"]')).toBeNull()
    expect(screen.queryByText('Fases de remediación')).toBeNull()
    expect(screen.queryByText('Fix ejecutado (estimado)')).toBeNull()
    expect(screen.queryByRole('button', { name: /^Ejecutar/ })).toBeNull()
    expect(within(estimatePanel()).queryByRole('button')).toBeNull()
    expect(within(estimatePanel()).getByText(/^Tiempo y costo son proyecciones del modelo de estimación/)).toBeInTheDocument()
  })

  it('la selección sigue siendo editable y recalcula la estimación', async () => {
    await renderApp('#/repo/' + SLUG)
    const before = estimatePanel().textContent
    fireEvent.click(screen.getByRole('button', { name: 'Solo Critical + High' }))
    expect(screen.getByLabelText('Seleccionar qs')).not.toBeChecked()
    expect(estimatePanel().textContent).not.toBe(before)
  })
})

describe('Paridad con la edición full', () => {
  async function snapshot(readonly: boolean, hash: string, pick: () => HTMLElement) {
    edition.readonly = readonly
    await renderApp(hash)
    const text = pick().textContent
    cleanup()
    location.hash = ''
    return text
  }

  it('el Portfolio es idéntico', async () => {
    const main = () => document.querySelector('main') as HTMLElement
    const full = await snapshot(false, '#/dashboard', main)
    const review = await snapshot(true, '#/dashboard', main)
    expect(review).toBe(full)
  })

  it('la estimación en vivo es idéntica salvo el botón', async () => {
    const full = await snapshot(false, '#/repo/' + SLUG, estimatePanel)
    const review = await snapshot(true, '#/repo/' + SLUG, estimatePanel)
    expect(full).toContain('Ejecutar las 3 fases en secuencia')
    expect(review).toBe(full!.replace('Ejecutar las 3 fases en secuencia', ''))
  })
})

describe('Guía en la edición review', () => {
  async function flush(ms = 0) {
    await act(async () => {
      vi.advanceTimersByTime(ms)
    })
  }

  it('cuenta 19 pasos y nunca navega a Remediados', async () => {
    await renderApp()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Ver guía' }))
    await flush()
    expect(screen.getByRole('dialog').textContent).toContain('paso 1 de 19')
    const hashes = new Set<string>()
    // Recorre hasta que la guía manual se cierra (el paso de cierre se omite en manual).
    for (let i = 0; i < 25 && screen.queryByRole('dialog'); i++) {
      expect(screen.getByRole('dialog').textContent).toMatch(/paso \d+ de 19/)
      hashes.add(location.hash)
      fireEvent.keyDown(window, { key: 'ArrowRight' })
      await flush(2000)
    }
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(hashes.has('#/remediados')).toBe(false)
    expect([...hashes].some((h) => h.startsWith('#/repo/'))).toBe(true)
  })
})

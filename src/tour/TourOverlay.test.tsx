import { act, fireEvent, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../test/renderApp'
import { buildTourSteps } from './steps'
import { demoDataset } from '../test/dataset'

const steps = buildTourSteps(demoDataset())
const eyebrow = () => screen.getByRole('dialog').textContent

afterEach(() => {
  vi.useRealTimers()
  location.hash = ''
})

async function flush(ms = 0) {
  await act(async () => {
    vi.advanceTimersByTime(ms)
  })
}

describe('Guía manual', () => {
  it('arranca pausada y navega con ← / → / Esc', async () => {
    await renderApp()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Ver guía' }))
    await flush()
    expect(eyebrow()).toContain('paso 1 de 21')
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeInTheDocument()
    await flush(5000) // pausada: no avanza sola
    expect(eyebrow()).toContain('paso 1 de 21')

    fireEvent.keyDown(window, { key: 'ArrowRight' })
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await flush(1000)
    expect(eyebrow()).toContain('paso 3 de 21')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await flush(1000)
    expect(eyebrow()).toContain('paso 4 de 21')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })
    await flush(1000)
    expect(eyebrow()).toContain('paso 3 de 21')

    fireEvent.keyDown(window, { key: 'Escape' })
    await flush()
    expect(screen.queryByRole('dialog')).toBeNull()
    // listeners restaurados: las flechas ya no hacen nada
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await flush(1000)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('en modo manual, avanzar desde el último paso visible cierra la guía', async () => {
    await renderApp()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Ver guía' }))
    await flush()
    // ← desde el primer paso va al cierre, que en manual se omite y cierra
    fireEvent.click(screen.getByRole('button', { name: '‹ Anterior' }))
    await flush()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('un target ausente se saltea tras 10 reintentos', async () => {
    await renderApp()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Ver guía' }))
    await flush()
    // el paso 2 apunta a [data-tour="kpis"]: lo sacamos del DOM
    document.querySelector('[data-tour="kpis"]')!.removeAttribute('data-tour')
    fireEvent.keyDown(window, { key: 'ArrowRight' })
    await flush(150 * 9)
    expect(screen.queryByText(steps[2].title)).toBeNull()
    await flush(150 * 2)
    expect(eyebrow()).toContain('paso 3 de 21')
    expect(screen.getByText(steps[2].title)).toBeInTheDocument()
  })
})

describe('Modo demo', () => {
  it('autoplay a seconds/2, pausa por click y reanuda a los 45 s', async () => {
    await renderApp()
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Modo demo' }))
    await flush()
    expect(eyebrow()).toContain('paso 1 de 22')
    await flush((steps[0].seconds / 2) * 1000 + 400)
    expect(eyebrow()).toContain('paso 2 de 22')

    await flush(2000)
    fireEvent.click(document.body)
    await flush(200)
    expect(screen.getByRole('button', { name: 'Reanudar' })).toBeInTheDocument()
    await flush(20000)
    expect(eyebrow()).toContain('paso 2 de 22')
    await flush(26000)
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument()
  })
})

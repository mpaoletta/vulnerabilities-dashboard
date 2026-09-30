import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/renderApp'
import { itemsFor } from '../../domain/items'
import { demoDataset } from '../../test/dataset'

const SLUG = 'vega-web'

afterEach(() => {
  vi.useRealTimers()
  location.hash = ''
})

const group = (tour: string) => document.querySelector(`[data-tour="${tour}"]`) as HTMLElement
const groupBox = (tour: string) => within(group(tour)).getAllByRole('checkbox')[0]
const card = (phase: string) => document.querySelector(`[data-phase="${phase}"]`) as HTMLElement
const cardButton = (phase: string) => within(card(phase)).getByRole('button')
const estimatePanel = () => document.querySelector('[data-tour="estimacion"]') as HTMLElement

describe('Proyecto', () => {
  it('selección por defecto: niveles 1–3 sí, nivel 4 no', async () => {
    await renderApp('#/repo/' + SLUG)
    const it = itemsFor(demoDataset().repositories[SLUG])
    expect(screen.getByText(`${it.deps.length} de ${it.deps.length + it.l4.length} seleccionadas`)).toBeInTheDocument()
    expect(screen.getByLabelText('Seleccionar @babel/core')).not.toBeChecked()
    expect(screen.getByLabelText('Seleccionar lodash')).toBeChecked()
  })

  it('checkbox de grupo tri-estado y recálculo de la estimación', async () => {
    await renderApp('#/repo/' + SLUG)
    const before = within(estimatePanel()).getByText(/de \d+ librerías/).textContent
    expect(groupBox('grupo-n2')).toHaveTextContent('✓')
    fireEvent.click(screen.getByLabelText('Seleccionar lodash'))
    fireEvent.click(screen.getByLabelText('Seleccionar qs'))
    expect(groupBox('grupo-n2')).toHaveTextContent('–')
    expect(groupBox('grupo-n2')).toHaveAttribute('aria-checked', 'mixed')
    const after = within(estimatePanel()).getByText(/de \d+ librerías/).textContent
    expect(after).not.toBe(before)
    expect(after).toMatch(/^5 de 7 librerías/)
    fireEvent.click(groupBox('grupo-n2'))
    expect(groupBox('grupo-n2')).toHaveTextContent('✓')
    expect(screen.getByLabelText('Seleccionar lodash')).toBeChecked()
  })

  it('Solo Critical + High deja sólo esas severidades', async () => {
    await renderApp('#/repo/' + SLUG)
    fireEvent.click(screen.getByRole('button', { name: 'Solo Critical + High' }))
    expect(screen.getByLabelText('Seleccionar lodash')).toBeChecked() // High
    expect(screen.getByLabelText('Seleccionar jspdf')).toBeChecked() // Critical
    expect(screen.getByLabelText('Seleccionar qs')).not.toBeChecked() // Medium
  })

  it('la selección se conserva al volver al repo', async () => {
    await renderApp('#/repo/' + SLUG)
    fireEvent.click(screen.getByLabelText('Seleccionar lodash'))
    await act(async () => {
      location.hash = '#/dashboard'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    await act(async () => {
      location.hash = '#/repo/' + SLUG
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(screen.getByLabelText('Seleccionar lodash')).not.toBeChecked()
  })

  it('bloqueo, secuencia, snapshot y sin timers colgados', async () => {
    const { unmount } = await renderApp('#/repo/' + SLUG)
    vi.useFakeTimers()
    expect(cardButton('fixcode')).toBeDisabled()
    expect(cardButton('fixcode')).toHaveTextContent('Requiere fixdeps')
    expect(card('fixcode')).toHaveTextContent('en espera de fixdeps')

    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar las 3 fases en secuencia' }))
    expect(card('fixdeps')).toHaveTextContent('en curso')
    const time = () => within(card('fixdeps')).getByText('Tiempo').nextSibling!.textContent
    const frozen = time()
    // cambiar la selección no altera el snapshot de la fase en curso
    fireEvent.click(screen.getByLabelText('Seleccionar lodash'))
    expect(time()).toBe(frozen)

    await act(async () => {
      vi.advanceTimersByTime(420 * 5)
    })
    expect(cardButton('fixdeps')).toHaveTextContent('Ejecutando… 50%')
    expect(cardButton('fixcode')).toBeDisabled()
    await act(async () => {
      vi.advanceTimersByTime(420 * 5)
    })
    expect(cardButton('fixdeps')).toHaveTextContent('Ejecutada')
    expect(card('fixdeps')).toHaveTextContent('commiteado · gate verde')
    expect(card('fixcode')).toHaveTextContent('pendiente')
    await act(async () => {
      vi.advanceTimersByTime(500)
    })
    expect(card('fixcode')).toHaveTextContent('en curso')
    expect(card('fixsecrets')).toHaveTextContent('en espera de fixcode')

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('la cadena completa termina con las 3 fases hechas', async () => {
    await renderApp('#/repo/' + SLUG)
    vi.useFakeTimers()
    fireEvent.click(screen.getByRole('button', { name: 'Ejecutar las 3 fases en secuencia' }))
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        vi.advanceTimersByTime(4200)
      })
      await act(async () => {
        vi.advanceTimersByTime(500)
      })
    }
    for (const p of ['fixdeps', 'fixcode', 'fixsecrets']) expect(cardButton(p)).toHaveTextContent('Ejecutada')
    expect(screen.getByText('PR abierto · pendiente de QA')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Remediación completa' })).toBeInTheDocument()
  })

  it('slug inexistente muestra el Portfolio', async () => {
    await renderApp('#/repo/no-existe')
    expect(screen.getByText('70 de 70 repositorios')).toBeInTheDocument()
  })
})

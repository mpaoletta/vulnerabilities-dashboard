import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { renderApp } from '../../test/renderApp'

afterEach(() => {
  vi.restoreAllMocks()
  location.hash = ''
})

describe('Remediados', () => {
  it('una tarjeta por repo remediado', async () => {
    const { data } = await renderApp('#/remediados')
    const remediated = data.fleet.repositories.filter((r) => r.demoState.stage === 'remediated')
    for (const r of remediated) expect(document.querySelector(`[data-tour="flows-${r.slug}"]`)).not.toBeNull()
    expect(document.querySelectorAll('[data-tour^="flows-"]')).toHaveLength(remediated.length)
    expect(screen.getByText(new RegExp('^' + remediated.length + ' repos · '))).toBeInTheDocument()
  })

  it('tildar un flujo registra el sello, actualiza el estado y persiste', async () => {
    const { data, unmount } = await renderApp('#/remediados')
    const slug = data.fleet.repositories.find((r) => r.demoState.stage === 'remediated')!.slug
    const block = () => document.querySelector(`[data-tour="flows-${slug}"]`) as HTMLElement
    const smoke = () => within(block()).getByLabelText('Verificado por QA: Smoke test de toda la app')
    fireEvent.click(smoke())
    expect(smoke()).toBeChecked()
    expect(within(block()).getByText(/^QA · m\.rodriguez · /)).toBeInTheDocument()
    expect(within(block()).getByText(/^1 de \d+ flujos verificados$/)).toBeInTheDocument()
    const card = block().closest('section')!
    expect(within(card).getByText('verificación parcial')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('rb-qa-v2')!)[slug + ':' + (within(block()).getAllByRole('checkbox').length - 1)]).toBeTruthy()

    // recarga: el check sigue con el mismo sello
    const stamp = within(block()).getByText(/^QA · m\.rodriguez · /).textContent
    unmount()
    await renderApp('#/remediados')
    expect(smoke()).toBeChecked()
    expect(within(block()).getByText(/^QA · m\.rodriguez · /).textContent).toBe(stamp)

    fireEvent.click(smoke())
    expect(smoke()).not.toBeChecked()
    expect(JSON.parse(localStorage.getItem('rb-qa-v2')!)).toEqual({})
  })
})

describe('Shell', () => {
  it('el tema se alterna, se persiste y se restaura', async () => {
    const { unmount } = await renderApp()
    fireEvent.click(screen.getByRole('button', { name: 'Tema oscuro' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(localStorage.getItem('rb-theme')).toBe('dark')
    unmount()
    await renderApp()
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
    expect(screen.getByRole('button', { name: 'Tema claro' })).toBeInTheDocument()
  })

  it('localStorage que lanza: arranca en claro y el QA funciona en memoria', async () => {
    const boom = () => {
      throw new Error('denied')
    }
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(boom)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(boom)
    await renderApp('#/remediados')
    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    const box = screen.getAllByLabelText('Verificado por QA: Smoke test de toda la app')[0]
    fireEvent.click(box)
    expect(box).toBeChecked()
    fireEvent.click(screen.getByRole('button', { name: 'Tema oscuro' }))
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark')
  })

  it('estado de carga y de error', async () => {
    const { render } = await import('@testing-library/react')
    const { default: App } = await import('../../app/App')
    const { unmount } = render(<App load={() => new Promise(() => {})} />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
    unmount()
    render(<App load={() => Promise.reject(new Error('sin red'))} />)
    expect(await screen.findByRole('alert')).toHaveTextContent('sin red')
  })
})

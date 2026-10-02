import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetConnectionForTests, setConnection, type Connection } from '../data/connection'
import type { Dataset } from '../data/types'
import { demoDataset } from '../test/dataset'
import { tenantDataset } from '../test/tenantDataset'
import { buildTourSteps } from '../tour/steps'
import App from './App'

afterEach(() => {
  setConnection(null)
  resetConnectionForTests()
})

function loader(tenant: Dataset) {
  return vi.fn((c: Connection | null) => Promise.resolve(c ? tenant : demoDataset()))
}

describe('fuente de datos en la app', () => {
  it('sin conexión muestra la demo, con la aclaración de anonimización', async () => {
    location.hash = '#/dashboard'
    const load = loader(tenantDataset())
    render(<App load={load} />)
    expect(await screen.findByText(/portfolio · 70 repositorios · nombres anonimizados/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fuente: demo' })).toBeInTheDocument()
    expect(load).toHaveBeenCalledWith(null)
  })

  it('con un portfolio conectado lo carga y no dice «anonimizados»', async () => {
    setConnection({ tenant: 'acme', key: 'vk_x_y' })
    location.hash = '#/dashboard'
    const load = loader(tenantDataset())
    render(<App load={load} />)
    expect(await screen.findByText(/portfolio · 2 repositorios/i)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/anonimizad|estimados de demo/i)
    expect(screen.getByText(/Datos reales del portfolio fixture-synthetic/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Portfolio: acme' })).toBeInTheDocument()
    expect(load).toHaveBeenCalledWith({ tenant: 'acme', key: 'vk_x_y' })
  })

  it('volver a la demo desde el header recarga los 70 repos', async () => {
    setConnection({ tenant: 'acme', key: 'vk_x_y' })
    location.hash = '#/dashboard'
    render(<App load={loader(tenantDataset())} />)
    const user = userEvent.setup()
    await user.click(await screen.findByRole('button', { name: 'Portfolio: acme' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Usar demo' }))
    expect(await screen.findByText(/portfolio · 70 repositorios/i)).toBeInTheDocument()
  })

  it('si la fuente falla, ofrece volver a la demo', async () => {
    setConnection({ tenant: 'acme', key: 'vk_revoked' })
    location.hash = '#/dashboard'
    const load = vi.fn((c: Connection | null) =>
      c ? Promise.reject(new Error('API key inválida')) : Promise.resolve(demoDataset()),
    )
    render(<App load={load} />)
    expect(await screen.findByText('API key inválida')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar demo' }))
    expect(await screen.findByText(/portfolio · 70 repositorios/i)).toBeInTheDocument()
  })

  it('Remediados oculta el PR simulado con datos reales', async () => {
    const data = tenantDataset()
    data.fleet.repositories[0].demoState.stage = 'remediated'
    setConnection({ tenant: 'acme', key: 'vk_x_y' })
    location.hash = '#/remediados'
    render(<App load={loader(data)} />)
    expect(await screen.findByText('Repositorios remediados')).toBeInTheDocument()
    expect(screen.queryByText('Pull request (simulado)')).not.toBeInTheDocument()
  })

  it('la guía se arma sin errores sobre un portfolio real', () => {
    expect(() => buildTourSteps(tenantDataset())).not.toThrow()
  })
})

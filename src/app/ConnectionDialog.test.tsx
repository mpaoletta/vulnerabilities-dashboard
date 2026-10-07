import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { getConnection, resetConnectionForTests, setConnection } from '../data/connection'
import { ApiError } from '../data/source'
import { ConnectionDialog } from './ConnectionDialog'

afterEach(() => {
  setConnection(null)
  resetConnectionForTests()
})

async function fill(tenant: string, key: string) {
  const user = userEvent.setup()
  await user.clear(screen.getByLabelText('Portfolio'))
  await user.type(screen.getByLabelText('Portfolio'), tenant)
  await user.type(screen.getByLabelText('API key'), key)
  await user.click(screen.getByRole('button', { name: 'Conectar' }))
}

describe('ConnectionDialog', () => {
  it('es un diálogo con foco en el primer campo y la key oculta', () => {
    render(<ConnectionDialog current={null} onClose={() => {}} validate={vi.fn()} />)
    expect(screen.getByRole('dialog', { name: 'Fuente de datos' })).toBeInTheDocument()
    expect(screen.getByLabelText('Portfolio')).toHaveFocus()
    expect(screen.getByLabelText('API key')).toHaveAttribute('type', 'password')
    expect(screen.queryByRole('button', { name: 'Usar demo' })).not.toBeInTheDocument()
  })

  it('conecta sólo si la validación responde bien', async () => {
    const onClose = vi.fn()
    const validate = vi.fn().mockResolvedValue({})
    location.hash = '#/repo/x'
    render(<ConnectionDialog current={null} onClose={onClose} validate={validate} />)
    await fill('falabella', 'vk_abcd1234_secret')
    expect(validate).toHaveBeenCalledWith({ tenant: 'falabella', key: 'vk_abcd1234_secret' })
    expect(getConnection()).toEqual({ tenant: 'falabella', key: 'vk_abcd1234_secret' })
    expect(onClose).toHaveBeenCalled()
    expect(location.hash).toBe('#/dashboard')
  })

  it('con 401 muestra el error y conserva la fuente anterior', async () => {
    const onClose = vi.fn()
    const validate = vi.fn().mockRejectedValue(new ApiError(401, 'API key inválida'))
    render(<ConnectionDialog current={null} onClose={onClose} validate={validate} />)
    await fill('falabella', 'vk_bad')
    expect(await screen.findByRole('alert')).toHaveTextContent('API key inválida')
    expect(getConnection()).toBeNull()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('valida el formato del portfolio sin llamar a la API', async () => {
    const validate = vi.fn()
    render(<ConnectionDialog current={null} onClose={() => {}} validate={validate} />)
    await fill('Falabella SA', 'vk_x')
    expect(screen.getByRole('alert')).toHaveTextContent('slug')
    expect(validate).not.toHaveBeenCalled()
  })

  it('«Usar demo» borra la conexión', async () => {
    setConnection({ tenant: 'acme', key: 'vk_x_y' })
    const onClose = vi.fn()
    render(<ConnectionDialog current={getConnection()} onClose={onClose} validate={vi.fn()} />)
    expect(screen.getByText('acme')).toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: 'Usar demo' }))
    expect(getConnection()).toBeNull()
    expect(sessionStorage.getItem('rb-connection')).toBeNull()
    expect(onClose).toHaveBeenCalled()
  })

  it('Escape cierra', async () => {
    const onClose = vi.fn()
    render(<ConnectionDialog current={null} onClose={onClose} validate={vi.fn()} />)
    await userEvent.setup().keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
  })

  it('la key no queda en el texto de la página', async () => {
    render(<ConnectionDialog current={null} onClose={() => {}} validate={vi.fn()} />)
    await userEvent.setup().type(screen.getByLabelText('API key'), 'vk_abcd1234_secret')
    expect(document.body.textContent).not.toContain('vk_abcd1234_secret')
  })
})

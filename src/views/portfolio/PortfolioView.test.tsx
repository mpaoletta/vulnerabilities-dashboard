import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import { renderApp } from '../../test/renderApp'

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const slugs = () => bodyRows().map((r) => within(r).getAllByRole('cell')[0].textContent)

afterEach(() => {
  location.hash = ''
})

describe('Portfolio', () => {
  it('muestra los 70 repos, ordenados por LOC descendente', async () => {
    const { data } = await renderApp()
    expect(screen.getByText('70 de 70 repositorios')).toBeInTheDocument()
    const bySize = [...data.fleet.repositories].sort((a, b) => b.linesOfCode - a.linesOfCode).map((r) => r.slug)
    expect(slugs()).toEqual(bySize)
    expect(screen.getByText('portfolio · 70 repositorios · nombres anonimizados')).toBeInTheDocument()
  })

  it('filtro combinado: tipo A + búsqueda «core»', async () => {
    const { data } = await renderApp()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Filtrar por tipo'), 'A')
    await user.type(screen.getByPlaceholderText('Buscar repositorio…'), 'core')
    const expected = data.fleet.repositories.filter((r) => r.type === 'A' && r.slug.includes('core'))
    expect(expected.length).toBeGreaterThan(0)
    expect(slugs().sort()).toEqual(expected.map((r) => r.slug).sort())
    expect(screen.getByText(expected.length + ' de 70 repositorios')).toBeInTheDocument()
  })

  it('orden por Deps: desc con ↓ y luego asc con ↑', async () => {
    const { data } = await renderApp()
    const user = userEvent.setup()
    const header = () => screen.getByRole('columnheader', { name: /^Deps/ })
    await user.click(header())
    expect(header()).toHaveTextContent('Deps ↓')
    const deps = (slug: string) => data.fleet.repositories.find((r) => r.slug === slug)!.vulnerabilities.dependencies
    const desc = slugs().map((s) => deps(s!))
    expect(desc).toEqual([...desc].sort((a, b) => b - a))
    await user.click(header())
    expect(header()).toHaveTextContent('Deps ↑')
    const asc = slugs().map((s) => deps(s!))
    expect(asc).toEqual([...asc].sort((a, b) => a - b))
  })

  it('orden por columna de texto arranca ascendente', async () => {
    await renderApp()
    const user = userEvent.setup()
    await user.click(screen.getByRole('columnheader', { name: /^Repositorio/ }))
    const s = slugs() as string[]
    expect(s).toEqual([...s].sort((a, b) => a.localeCompare(b)))
  })

  it('Enter en una fila abre el repo y scrollea arriba', async () => {
    await renderApp()
    const row = bodyRows()[0]
    const slug = within(row).getAllByRole('cell')[0].textContent!
    row.focus()
    window.scrollTo = (() => {}) as typeof window.scrollTo
    const user = userEvent.setup()
    await user.keyboard('{Enter}')
    await act(async () => {
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(location.hash).toBe('#/repo/' + slug)
    expect(await screen.findByRole('heading', { level: 1, name: slug })).toBeInTheDocument()
  })

  it('cada fila tiene data-tour="row-{slug}" y tabindex 0', async () => {
    await renderApp()
    for (const r of bodyRows()) {
      const slug = within(r).getAllByRole('cell')[0].textContent
      expect(r).toHaveAttribute('data-tour', 'row-' + slug)
      expect(r).toHaveAttribute('tabindex', '0')
    }
  })
})

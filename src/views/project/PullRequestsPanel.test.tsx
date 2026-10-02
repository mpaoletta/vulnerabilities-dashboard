import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../app/App'
import { resetConnectionForTests, setConnection, type Connection } from '../../data/connection'
import type { PrGate } from '../../data/types'
import { demoDataset } from '../../test/dataset'
import { tenantDataset } from '../../test/tenantDataset'
import { NO_PERMISSION_MSG, PENDING_STATUS_MSG, PullRequestsPanel } from './PullRequestsPanel'

const CONN: Connection = { tenant: 'acme', key: 'vk_ab12_secret' }
const LODASH = 'dep:npm:lodash:CVE-2021-23337'

const gate = (pr: number, state: PrGate['state'], patch: Partial<PrGate> = {}): PrGate => ({
  pr,
  prUrl: `https://github.com/acme/web/pull/${pr}`,
  branch: `feature/${pr}`,
  state,
  latest: {
    runKey: `gate-pr${pr}-x`,
    pr,
    headSha: 'abcdef1234567',
    branch: `feature/${pr}`,
    baseRef: 'main',
    result: state === 'pass' ? 'pass' : 'fail',
    policyPassed: state === 'pass',
    fingerprint: 'f'.repeat(64),
    blocking: state === 'pass' ? [] : [LODASH, 'secret:AWS:src/config.js'],
    exitCode: state === 'pass' ? 0 : 1,
    startedAt: '2026-10-02T10:00:00Z',
  },
  ...patch,
})

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function mockApi(opts: { gates?: PrGate[]; approveGates?: boolean; gatesStatus?: number; statusPublished?: boolean }) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/key')) return json({ name: 'ana', prefix: 'ab12', scope: 'read', approveGates: opts.approveGates ?? false })
    if (url.endsWith('/gates') && method === 'GET') return json(opts.gatesStatus ? { detail: 'boom' } : (opts.gates ?? []), opts.gatesStatus ?? 200)
    if (url.endsWith('/override') && method === 'POST')
      return json({ override: { id: 'ov-1' }, statusPublished: opts.statusPublished ?? false }, 201)
    if (url.endsWith('/revoke') && method === 'POST') return json({ id: 'ov-1' })
    return json({ detail: 'no mockeado: ' + url }, 500)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

async function renderPanel() {
  render(<PullRequestsPanel slug="web" connection={CONN} />)
  await act(async () => {})
}

afterEach(() => {
  vi.unstubAllGlobals()
  resetConnectionForTests()
})

describe('PullRequestsPanel', () => {
  it('lista cada PR con su estado y sus bloqueantes', async () => {
    mockApi({ gates: [gate(42, 'blocked'), gate(7, 'pass')] })
    await renderPanel()
    const row = document.querySelector('[data-pr="42"]') as HTMLElement
    expect(within(row).getByText('bloqueada')).toBeTruthy()
    expect(within(row).getByText('2 bloqueante(s)')).toBeTruthy()
    expect(within(row).getByRole('link').getAttribute('href')).toBe('https://github.com/acme/web/pull/42')
    fireEvent.click(within(row).getByRole('button', { name: '#42' }))
    expect(screen.getByText('lodash (npm) · CVE-2021-23337')).toBeTruthy()
    expect(screen.getByText('secreto AWS en src/config.js')).toBeTruthy()
    expect(within(document.querySelector('[data-pr="7"]') as HTMLElement).getByText('pasa')).toBeTruthy()
  })

  it('sin permiso, «Aprobar» está deshabilitado con el motivo', async () => {
    mockApi({ gates: [gate(42, 'blocked')], approveGates: false })
    await renderPanel()
    const button = screen.getByRole('button', { name: 'Aprobar' }) as HTMLButtonElement
    expect(button.disabled).toBe(true)
    expect(screen.getByText(NO_PERMISSION_MSG)).toBeTruthy()
  })

  it('aprueba con motivo obligatorio y avisa si el check queda pendiente', async () => {
    const fetchMock = mockApi({ gates: [gate(42, 'blocked')], approveGates: true, statusPublished: false })
    await renderPanel()
    fireEvent.click(screen.getByRole('button', { name: 'Aprobar' }))
    const confirm = screen.getByRole('button', { name: 'Confirmar aprobación' }) as HTMLButtonElement
    expect(confirm.disabled).toBe(true)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'falso positivo, JIRA-12' } })
    await act(async () => {
      fireEvent.click(confirm)
    })
    const post = fetchMock.mock.calls.find(([u, i]) => String(u).endsWith('/gates/42/override') && (i as RequestInit)?.method === 'POST')
    expect(JSON.parse(String((post![1] as RequestInit).body))).toEqual({ reason: 'falso positivo, JIRA-12' })
    expect(screen.getByRole('status').textContent).toContain(PENDING_STATUS_MSG)
  })

  it('muestra quién aprobó y permite revocar', async () => {
    const fetchMock = mockApi({
      gates: [
        gate(42, 'approved', {
          override: {
            id: 'ov-1',
            pr: 42,
            fingerprint: 'f',
            findings: [LODASH],
            source: 'environment',
            approvedBy: 'sec-lead',
            reason: 'riesgo aceptado',
            createdAt: '',
          },
        }),
      ],
      approveGates: true,
    })
    await renderPanel()
    expect(screen.getByText('sec-lead')).toBeTruthy()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Revocar' }))
    })
    expect(fetchMock.mock.calls.some(([u]) => String(u).endsWith('/gates/42/override/ov-1/revoke'))).toBe(true)
  })

  it('sin gates no muestra nada; con error lo dice', async () => {
    mockApi({ gates: [] })
    const { container, unmount } = render(<PullRequestsPanel slug="web" connection={CONN} />)
    await act(async () => {})
    expect(container.querySelector('[data-testid="pull-requests"]')).toBeNull()
    unmount()
    mockApi({ gatesStatus: 500 })
    await renderPanel()
    expect(screen.getByText(/No se pudieron leer los gates de PR/)).toBeTruthy()
  })
})

describe('ProjectView', () => {
  it('en demo no hay sección de Pull Requests', async () => {
    const fetchMock = mockApi({ gates: [gate(42, 'blocked')] })
    location.hash = '#/repo/vega-web'
    render(<App load={() => Promise.resolve(demoDataset())} />)
    await screen.findByText('Fases de remediación')
    await act(async () => {})
    expect(screen.queryByText('Pull Requests')).toBeNull()
    expect(fetchMock.mock.calls.some(([u]) => String(u).includes('/gates'))).toBe(false)
  })

  it('con un portfolio conectado la muestra', async () => {
    mockApi({ gates: [gate(42, 'blocked')] })
    setConnection(CONN)
    location.hash = '#/repo/legacy-web'
    render(<App load={(c: Connection | null) => Promise.resolve(c ? tenantDataset() : demoDataset())} />)
    await screen.findByText('Fases de remediación')
    await act(async () => {})
    expect(await screen.findByText('Pull Requests')).toBeTruthy()
  })
})

import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetConnectionForTests, setConnection, type Connection } from '../data/connection'
import type { RemediationJob, UnreviewedRepository, WorkerInfo } from '../data/types'
import { demoDataset } from '../test/dataset'
import { tenantDataset } from '../test/tenantDataset'
import App from './App'
import { POLL_MS } from './jobRunner'
import { REREVIEW_CONFIRM } from './reviewRunner'

const NEW = 'api-core'
const REVIEWED = 'legacy-web'

function job(patch: Partial<RemediationJob> = {}): RemediationJob {
  return {
    id: 'rev-1',
    repository: NEW,
    status: 'queued',
    phases: ['review'],
    currentPhase: null,
    selection: {},
    eligibleWorkers: 1,
    ...patch,
  }
}

const item = (patch: Partial<UnreviewedRepository> = {}): UnreviewedRepository => ({
  slug: NEW,
  registered: false,
  workers: [{ workerId: 'w1', hostname: 'mac-mini' }],
  activeJob: null,
  ...patch,
})

const ONLINE: WorkerInfo = {
  workerId: 'w1',
  hostname: 'mac-mini',
  lastSeenAt: '',
  online: true,
  repositories: [NEW, REVIEWED],
}

interface Api {
  scope?: string
  workers?: WorkerInfo[]
  /** Respuestas sucesivas de `GET …/unreviewed-repositories` (la última se repite). */
  lists?: UnreviewedRepository[][]
  /** Alternativa a `lists`: el listado se calcula en cada request. */
  list?: () => UnreviewedRepository[]
  create?: () => Response
  /** Respuestas sucesivas de `GET …/jobs/{id}` (la última se repite). */
  polls?: RemediationJob[]
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function mockApi(api: Api) {
  const lists = [...(api.lists ?? [[item()]])]
  const polls = [...(api.polls ?? [])]
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/key')) return json({ name: 'dash', prefix: 'ab12', scope: api.scope ?? 'operate' })
    if (url.endsWith('/workers')) return json(api.workers ?? [ONLINE])
    if (url.endsWith('/unreviewed-repositories')) return json(api.list ? api.list() : lists.length > 1 ? lists.shift() : lists[0])
    if (url.endsWith('/jobs') && method === 'GET') return json([])
    if (url.endsWith('/cancel') && method === 'POST') return json(job({ status: 'cancelled' }))
    if (url.endsWith('/jobs') && method === 'POST') return api.create ? api.create() : json(job(), 201)
    if (url.includes('/jobs/')) return json(polls.length > 1 ? polls.shift() : polls[0])
    return json({ detail: 'no mockeado: ' + url }, 500)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const posts = (f: ReturnType<typeof mockApi>) =>
  f.mock.calls.filter(([u, i]) => String(u).endsWith('/jobs') && (i as RequestInit | undefined)?.method === 'POST')

const section = () => screen.queryByText('Sin review')?.closest('section') ?? null
const controls = (slug: string) => document.querySelector(`[data-review="${slug}"]`) as HTMLElement
const reviewButton = (slug: string) => within(controls(slug)).getAllByRole('button')[0]
const tick = () => act(() => vi.advanceTimersByTimeAsync(POLL_MS))

async function renderPortfolio(connected = true) {
  if (connected) setConnection({ tenant: 'acme', key: 'vk_ab12_secret' })
  location.hash = '#/dashboard'
  const load = vi.fn((c: Connection | null) => Promise.resolve(c ? tenantDataset() : demoDataset()))
  render(<App load={load} />)
  await screen.findByPlaceholderText('Buscar repositorio…')
  await act(async () => {})
  return load
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  setConnection(null)
  resetConnectionForTests()
  location.hash = ''
})

describe('repos sin review en el portfolio', () => {
  it('lista los clones sin review con el worker que los tiene', async () => {
    mockApi({})
    await renderPortfolio()
    expect(section()).not.toBeNull()
    expect(within(section()!).getByText(NEW)).toBeTruthy()
    expect(within(section()!).getByText('en mac-mini')).toBeTruthy()
    expect((reviewButton(NEW) as HTMLButtonElement).disabled).toBe(false)
  })

  it('no aparece con la lista vacía', async () => {
    mockApi({ lists: [[]] })
    await renderPortfolio()
    expect(section()).toBeNull()
  })

  it('no aparece en la demo ni pide nada a la API', async () => {
    const fetchMock = mockApi({})
    await renderPortfolio(false)
    expect(section()).toBeNull()
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('disparo del review', () => {
  it.each([
    ['la key es de sólo lectura', { scope: 'read' }],
    ['ningún worker conectado tiene este repo clonado', { lists: [[item({ workers: [] })]], workers: [] }],
    ['el repo ya tiene un job en curso', { lists: [[item({ activeJob: { id: 'x', status: 'running', phases: ['review'] } })]] }],
  ] as Array<[string, Api]>)('deshabilitado: %s', async (reason, api) => {
    mockApi(api)
    await renderPortfolio()
    expect((reviewButton(NEW) as HTMLButtonElement).disabled).toBe(true)
    expect(within(controls(NEW)).getByText(reason)).toBeTruthy()
  })

  it('crea un job de review y lo muestra en cola', async () => {
    const fetchMock = mockApi({ polls: [job()] })
    await renderPortfolio()
    await act(async () => fireEvent.click(reviewButton(NEW)))
    const [[url, init]] = posts(fetchMock)
    expect(String(url)).toMatch(/\/v1\/tenants\/acme\/repositories\/api-core\/jobs$/)
    expect(JSON.parse(String((init as RequestInit).body))).toEqual({ phases: ['review'] })
    expect(within(controls(NEW)).getByText('en cola')).toBeTruthy()
    expect(within(controls(NEW)).getByText('Cancelar')).toBeTruthy()
  })

  it('al terminar bien recarga el dataset y el repo sale de «Sin review»', async () => {
    const polls = [job({ status: 'running', hostname: 'mac-mini' }), job({ status: 'succeeded' })]
    let reviewed = false
    mockApi({ list: () => (reviewed ? [] : [item()]), polls })
    const load = await renderPortfolio()
    await act(async () => fireEvent.click(reviewButton(NEW)))
    await tick()
    expect(within(controls(NEW)).getByText('review en curso en mac-mini')).toBeTruthy()
    const loads = load.mock.calls.length
    reviewed = true // el run publicado ya fijó el review en la API
    await tick()
    await act(async () => {})
    expect(load.mock.calls.length).toBeGreaterThan(loads)
    expect(section()).toBeNull()
  })

  it('un fallo muestra el motivo y vuelve a ofrecer el review', async () => {
    mockApi({ polls: [job({ status: 'failed', reason: 'branch-failed', exitCode: 9 })] })
    await renderPortfolio()
    await act(async () => fireEvent.click(reviewButton(NEW)))
    await tick()
    await act(async () => {})
    expect(within(controls(NEW)).getByText(/el clone tiene al menos un commit/)).toBeTruthy()
    expect((reviewButton(NEW) as HTMLButtonElement).disabled).toBe(false)
    expect(reviewButton(NEW).textContent).toBe('Ejecutar review')
  })
})

describe('re-ejecutar el review de un repo revisado', () => {
  async function renderRepo() {
    setConnection({ tenant: 'acme', key: 'vk_ab12_secret' })
    location.hash = '#/repo/' + REVIEWED
    render(<App load={() => Promise.resolve(tenantDataset())} />)
    await screen.findByText('Fases de remediación')
    await act(async () => {})
  }

  it('pide confirmación y, si se rechaza, no crea nada', async () => {
    const fetchMock = mockApi({ lists: [[]] })
    await renderRepo()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await act(async () => fireEvent.click(reviewButton(REVIEWED)))
    expect(confirm).toHaveBeenCalledWith(REREVIEW_CONFIRM)
    expect(posts(fetchMock)).toHaveLength(0)
  })

  it('confirmado, encola el review', async () => {
    const fetchMock = mockApi({ lists: [[]], polls: [job({ repository: REVIEWED })] })
    await renderRepo()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    expect(reviewButton(REVIEWED).textContent).toBe('Re-ejecutar review')
    await act(async () => fireEvent.click(reviewButton(REVIEWED)))
    expect(String(posts(fetchMock)[0][0])).toMatch(/repositories\/legacy-web\/jobs$/)
  })

  it('en la demo no se ofrece', async () => {
    mockApi({})
    location.hash = '#/repo/vega-web'
    render(<App load={() => Promise.resolve(demoDataset())} />)
    await screen.findByText('Fases de remediación')
    expect(screen.queryByText('Re-ejecutar review')).toBeNull()
  })
})

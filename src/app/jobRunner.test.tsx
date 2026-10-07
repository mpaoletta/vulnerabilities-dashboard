import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { resetConnectionForTests, setConnection, type Connection } from '../data/connection'
import type { RemediationJob, WorkerInfo } from '../data/types'
import { demoDataset } from '../test/dataset'
import { tenantDataset } from '../test/tenantDataset'
import App from './App'
import { LOCAL_ONLY_MSG, POLL_MS, REVIEW_RUNNING_MSG } from './jobRunner'

const SLUG = 'legacy-web'
const card = (phase: string) => document.querySelector(`[data-phase="${phase}"]`) as HTMLElement
const cardButton = (phase: string) => within(card(phase)).getAllByRole('button')[0]

function job(patch: Partial<RemediationJob> = {}): RemediationJob {
  return {
    id: 'job-1',
    repository: SLUG,
    status: 'queued',
    phases: ['fixcode'],
    currentPhase: null,
    selection: {},
    eligibleWorkers: 1,
    ...patch,
  }
}

const ONLINE: WorkerInfo = { workerId: 'w1', hostname: 'mac', lastSeenAt: '', online: true, repositories: [SLUG] }

interface Api {
  scope?: string
  workers?: WorkerInfo[]
  /** `GET …/jobs`: los jobs del repo, el más reciente primero. */
  jobs?: RemediationJob[]
  create?: () => Response
  /** Respuestas sucesivas de `GET …/jobs/{id}` (la última se repite). */
  polls?: RemediationJob[]
  cancel?: RemediationJob
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

function mockApi(api: Api) {
  const polls = [...(api.polls ?? [])]
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    const method = init?.method ?? 'GET'
    if (url.endsWith('/key')) return json({ name: 'dash', prefix: 'ab12', scope: api.scope ?? 'operate' })
    if (url.endsWith('/workers')) return json(api.workers ?? [ONLINE])
    if (url.endsWith(`/repositories/${SLUG}/jobs`) && method === 'GET') return json(api.jobs ?? [])
    if (url.endsWith('/cancel') && method === 'POST') return json(api.cancel)
    if (url.endsWith(`/repositories/${SLUG}/jobs`) && method === 'POST') return api.create ? api.create() : json(job(), 201)
    if (url.includes('/jobs/')) return json(polls.length > 1 ? polls.shift() : polls[0])
    return json({ detail: 'no mockeado: ' + url }, 500)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

const calls = (f: ReturnType<typeof mockApi>, pred: (url: string, method: string) => boolean) =>
  f.mock.calls.filter(([u, i]) => pred(String(u), (i as RequestInit | undefined)?.method ?? 'GET'))

/** El dataset del tenant con `fixdeps` de SLUG ya `done` en la API (su último run terminó). */
function fixdepsDone() {
  const d = tenantDataset()
  const row = d.fleet.repositories.find((r) => r.slug === SLUG)!
  row.demoState.phases = row.demoState.phases.map((p) => (p.phase === 'fixdeps' ? { ...p, status: 'done' } : p))
  return d
}

async function renderRepo(connected = true, dataset = tenantDataset) {
  if (connected) setConnection({ tenant: 'acme', key: 'vk_ab12_secret' })
  location.hash = '#/repo/' + (connected ? SLUG : 'vega-web')
  const load = vi.fn((c: Connection | null) => Promise.resolve(c ? dataset() : demoDataset()))
  render(<App load={load} />)
  await screen.findByText('Fases de remediación')
  // deja resolver key/workers/job activo
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

const tick = () => act(() => vi.advanceTimersByTimeAsync(POLL_MS))

describe('runner real (portfolio conectado)', () => {
  it('ejecutar una fase crea un job con la selección traducida y queda en cola', async () => {
    const f = mockApi({ polls: [job()] })
    await renderRepo()
    expect(screen.getAllByText(LOCAL_ONLY_MSG).length).toBeGreaterThan(0)
    // en modo real fixcode no espera a fixdeps
    expect(cardButton('fixcode')).toHaveTextContent('Ejecutar fixcode')
    await act(async () => fireEvent.click(cardButton('fixcode')))
    const posts = calls(f, (u, m) => m === 'POST' && u.endsWith('/jobs'))
    expect(posts).toHaveLength(1)
    expect(String(posts[0][0])).toBe(`/api/v1/tenants/acme/repositories/${SLUG}/jobs`)
    const init = posts[0][1] as RequestInit
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer vk_ab12_secret')
    expect(JSON.parse(String(init.body))).toEqual({
      phases: ['fixcode'],
      selection: {
        fixcode: {
          mode: 'subset',
          files: [
            { file: 'src/main/java/App.java', severity: 'HIGH' },
            { file: 'src/main/java/Http.java', severity: 'MEDIUM' },
          ],
        },
      },
    })
    expect(card('fixcode')).toHaveTextContent('en cola')
    expect(cardButton('fixcode')).toBeDisabled()
  })

  it('refleja el avance y, al terminar parcial, recarga el dataset', async () => {
    mockApi({
      polls: [
        job({ status: 'running', currentPhase: 'fixcode', progress: { fixcode: { total: 2, doing: 1, done: 1, skipped: 0 } } }),
        job({
          status: 'partial',
          currentPhase: 'fixcode',
          progress: { fixcode: { total: 2, doing: 0, done: 1, skipped: 1 } },
          phaseResults: { fixcode: { exitCode: 0, exitName: 'OK' } },
        }),
      ],
    })
    const load = await renderRepo()
    await act(async () => fireEvent.click(cardButton('fixcode')))
    await tick()
    expect(card('fixcode')).toHaveTextContent('1/2 unidades')
    expect(card('fixcode')).toHaveTextContent('en curso')
    await tick()
    expect(card('fixcode')).toHaveTextContent('1 salteadas, 1 corregidas')
    expect(card('fixcode')).toHaveTextContent('50%')
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('con todas las unidades salteadas no dice «completado» ni 100%', async () => {
    mockApi({
      polls: [
        job({
          status: 'partial',
          phases: ['fixdeps'],
          currentPhase: 'fixdeps',
          progress: { fixdeps: { total: 4, doing: 0, done: 0, skipped: 4 } },
          phaseResults: { fixdeps: { exitCode: 0, exitName: 'OK' } },
        }),
      ],
    })
    await renderRepo()
    await act(async () => fireEvent.click(cardButton('fixdeps')))
    await tick()
    expect(card('fixdeps')).toHaveTextContent('4 salteadas, 0 corregidas')
    expect(card('fixdeps')).not.toHaveTextContent('completado')
    expect(card('fixdeps')).toHaveTextContent('0%')
  })

  it('al abrir el proyecto, el último job terminado explica la fase que la API da por hecha', async () => {
    const finished = job({
      status: 'partial',
      phases: ['fixdeps', 'fixcode'],
      progress: { fixdeps: { total: 4, doing: 0, done: 0, skipped: 4 }, fixcode: { total: 2, doing: 0, done: 0, skipped: 2 } },
      phaseResults: { fixdeps: { exitCode: 0, exitName: 'OK' }, fixcode: { exitCode: 0, exitName: 'OK' } },
    })
    const f = mockApi({ jobs: [finished] })
    await renderRepo(true, fixdepsDone)
    expect(card('fixdeps')).toHaveTextContent('4 salteadas, 0 corregidas')
    // fixcode sigue pendiente en la API (p. ej. un review posterior): el job viejo no la pisa
    expect(card('fixcode')).toHaveTextContent('pendiente')
    expect(calls(f, (u) => u.includes('/jobs/'))).toHaveLength(0)
  })

  it('un fallo muestra el motivo legible y el exit code', async () => {
    mockApi({ polls: [job({ status: 'failed', currentPhase: 'fixcode', exitCode: 23, reason: 'missing-env-vars' })] })
    await renderRepo()
    await act(async () => fireEvent.click(cardButton('fixcode')))
    await tick()
    expect(card('fixcode')).toHaveTextContent('falta una variable de entorno del build (exit 23)')
    expect(cardButton('fixcode')).toHaveTextContent('Reintentar fixcode')
  })

  it('cancelar un job en cola vuelve la tarjeta a su estado previo', async () => {
    const f = mockApi({ polls: [job()], cancel: job({ status: 'cancelled' }) })
    await renderRepo()
    await act(async () => fireEvent.click(cardButton('fixcode')))
    expect(card('fixcode')).toHaveTextContent('en cola')
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Cancelar job en cola' })))
    expect(calls(f, (u, m) => m === 'POST' && u.endsWith('/jobs/job-1/cancel'))).toHaveLength(1)
    expect(card('fixcode')).toHaveTextContent('pendiente')
    expect(cardButton('fixcode')).toHaveTextContent('Ejecutar fixcode')
  })

  it('retoma el job activo creado en otra pestaña', async () => {
    const running = job({
      status: 'running',
      phases: ['fixdeps', 'fixcode'],
      currentPhase: 'fixdeps',
      progress: { fixdeps: { total: 4, doing: 1, done: 2, skipped: 0 } },
    })
    const f = mockApi({ jobs: [running], polls: [running] })
    await renderRepo()
    expect(card('fixdeps')).toHaveTextContent('2/4 unidades')
    expect(card('fixcode')).toHaveTextContent('en espera')
    expect(calls(f, (_u, m) => m === 'POST')).toHaveLength(0)
  })

  it('un re-review lanzado desde el repo bloquea las fases hasta que termina', async () => {
    const review = job({ id: 'rev-1', status: 'queued', phases: ['review'] })
    const f = mockApi({ create: () => json(review, 201), polls: [review] })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    await renderRepo()
    expect(cardButton('fixdeps')).not.toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Re-ejecutar review' }))
    await act(async () => {})

    expect(cardButton('fixdeps')).toBeDisabled()
    expect(card('fixdeps')).toHaveTextContent(REVIEW_RUNNING_MSG)
    expect(screen.getByRole('button', { name: 'Ejecutar las 3 fases en secuencia' })).toBeDisabled()
    fireEvent.click(cardButton('fixdeps'))
    const posts = calls(f, (_u, m) => m === 'POST')
    expect(posts).toHaveLength(1) // sólo el review: ningún job de fixdeps que la API rechace con 409
    expect(JSON.parse(String((posts[0][1] as RequestInit).body))).toEqual({ phases: ['review'] })
  })

  it('un review activo creado en otra pestaña también bloquea las fases', async () => {
    const review = job({ id: 'rev-2', status: 'running', phases: ['review'] })
    const f = mockApi({ jobs: [review], polls: [review] })
    await renderRepo()
    expect(cardButton('fixdeps')).toBeDisabled()
    expect(card('fixdeps')).toHaveTextContent(REVIEW_RUNNING_MSG)
    expect(screen.getByRole('button', { name: 'Ejecutar las 3 fases en secuencia' })).toBeDisabled()
    expect(calls(f, (_u, m) => m === 'POST')).toHaveLength(0)
  })

  it('con una key de sólo lectura no se puede ejecutar', async () => {
    const f = mockApi({ scope: 'read' })
    await renderRepo()
    expect(cardButton('fixcode')).toBeDisabled()
    expect(card('fixcode')).toHaveTextContent('la key es de sólo lectura')
    expect(screen.getByRole('button', { name: 'Ejecutar las 3 fases en secuencia' })).toBeDisabled()
    fireEvent.click(cardButton('fixcode'))
    expect(calls(f, (_u, m) => m === 'POST')).toHaveLength(0)
  })

  it('si ningún worker conectado tiene el repo pide confirmación', async () => {
    const f = mockApi({ workers: [{ ...ONLINE, repositories: ['otro-repo'] }] })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await renderRepo()
    await act(async () => fireEvent.click(cardButton('fixcode')))
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/Ningún worker conectado tiene este repo clonado/))
    expect(calls(f, (u, m) => m === 'POST' && u.endsWith('/jobs'))).toHaveLength(0)
  })

  it('un job en cola sin workers elegibles lo explica', async () => {
    mockApi({ jobs: [job({ eligibleWorkers: 0 })], polls: [job({ eligibleWorkers: 0 })] })
    await renderRepo()
    expect(card('fixcode')).toHaveTextContent('ningún worker conectado tiene este repo clonado')
  })

  it('un 422 muestra los ítems que la API no pudo resolver', async () => {
    mockApi({
      create: () =>
        json(
          { detail: { message: 'Selección inválida', unresolved: [{ phase: 'fixcode', item: { file: 'src/main/java/App.java' } }] } },
          422,
        ),
    })
    await renderRepo()
    await act(async () => fireEvent.click(cardButton('fixcode')))
    expect(screen.getByRole('alert')).toHaveTextContent('fixcode: src/main/java/App.java')
    expect(card('fixcode')).toHaveTextContent('pendiente')
  })

  it('«Ejecutar las 3 fases» manda un único job con las fases seleccionadas', async () => {
    const f = mockApi({ polls: [job({ phases: ['fixdeps', 'fixcode', 'fixsecrets'] })] })
    await renderRepo()
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Ejecutar las 3 fases en secuencia' })))
    const posts = calls(f, (u, m) => m === 'POST' && u.endsWith('/jobs'))
    expect(posts).toHaveLength(1)
    expect(JSON.parse(String((posts[0][1] as RequestInit).body)).phases).toEqual(['fixdeps', 'fixcode', 'fixsecrets'])
  })
})

describe('demo', () => {
  it('sigue simulando sin requests de jobs', async () => {
    const f = mockApi({})
    await renderRepo(false)
    fireEvent.click(cardButton('fixdeps'))
    expect(card('fixdeps')).toHaveTextContent('en curso')
    expect(f).not.toHaveBeenCalled()
    expect(screen.queryByText(LOCAL_ONLY_MSG)).not.toBeInTheDocument()
  })
})

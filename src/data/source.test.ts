import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const fetchMock = vi.fn()

async function freshSource() {
  vi.resetModules()
  return import('./source')
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

beforeEach(() => {
  fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('loadDataset', () => {
  it('pide el dataset a /api/dataset por defecto', async () => {
    const dataset = { meta: {}, fleet: { repositories: [] }, repositories: {} }
    fetchMock.mockResolvedValue(jsonResponse(dataset))
    const { loadDataset } = await freshSource()
    await expect(loadDataset()).resolves.toEqual(dataset)
    expect(fetchMock).toHaveBeenCalledWith('/api/dataset', expect.anything())
  })

  it('usa VITE_API_BASE_URL', async () => {
    vi.stubEnv('VITE_API_BASE_URL', 'https://api.ejemplo/api/')
    fetchMock.mockResolvedValue(jsonResponse({}))
    const { loadDataset } = await freshSource()
    await loadDataset()
    expect(fetchMock).toHaveBeenCalledWith('https://api.ejemplo/api/dataset', expect.anything())
  })

  it('comparte la request en curso', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    const { loadDataset } = await freshSource()
    await Promise.all([loadDataset(), loadDataset()])
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('informa el status y el detail cuando la API responde error', async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: 'Datos no disponibles' }, 503))
    const { loadDataset } = await freshSource()
    await expect(loadDataset()).rejects.toThrow('La API respondió 503: Datos no disponibles')
  })

  it('informa el error de red', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const { loadDataset } = await freshSource()
    await expect(loadDataset()).rejects.toThrow(/No se pudo conectar con la API .*Failed to fetch/)
  })

  it('no cachea el fallo: el siguiente intento vuelve a pedir', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(jsonResponse({ ok: 1 }))
    const { loadDataset } = await freshSource()
    await expect(loadDataset()).rejects.toThrow()
    await expect(loadDataset()).resolves.toEqual({ ok: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('con un portfolio conectado pide su dataset con la key', async () => {
    fetchMock.mockResolvedValue(jsonResponse({}))
    const { loadDataset } = await freshSource()
    await loadDataset({ tenant: 'falabella', key: 'vk_abcd1234_secret' })
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/tenants/falabella/dataset', {
      headers: { Accept: 'application/json', Authorization: 'Bearer vk_abcd1234_secret' },
    })
  })

  it('traduce 401 y 403 a mensajes claros', async () => {
    const { loadDataset } = await freshSource()
    const c = { tenant: 'acme', key: 'vk_x_y' }
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'API key inválida' }, 401))
    await expect(loadDataset(c)).rejects.toMatchObject({ status: 401, message: 'API key inválida' })
    fetchMock.mockResolvedValueOnce(jsonResponse({ detail: 'x' }, 403))
    await expect(loadDataset(c)).rejects.toThrow('La API key no es de ese portfolio')
  })

  it('no reutiliza un resultado ya terminado (reconectar trae datos frescos)', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ v: 1 })).mockResolvedValueOnce(jsonResponse({ v: 2 }))
    const { loadDataset } = await freshSource()
    await expect(loadDataset()).resolves.toEqual({ v: 1 })
    await expect(loadDataset()).resolves.toEqual({ v: 2 })
  })

  it('rechaza un cuerpo que no es JSON', async () => {
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }))
    const { loadDataset } = await freshSource()
    await expect(loadDataset()).rejects.toThrow('no es JSON')
  })
})

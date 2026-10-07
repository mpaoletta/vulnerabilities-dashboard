import { afterEach, describe, expect, it, vi } from 'vitest'
import { connectionId, getConnection, resetConnectionForTests, setConnection } from './connection'

afterEach(() => {
  vi.restoreAllMocks()
  setConnection(null)
  resetConnectionForTests()
})

describe('connection', () => {
  it('sin nada guardado es la demo', () => {
    resetConnectionForTests()
    expect(getConnection()).toBeNull()
    expect(connectionId(null)).toBe('demo')
  })

  it('se guarda en sessionStorage y se relee', () => {
    setConnection({ tenant: 'acme', key: 'vk_abcd1234_secret' })
    expect(JSON.parse(sessionStorage.getItem('rb-connection') ?? 'null')).toEqual({
      tenant: 'acme',
      key: 'vk_abcd1234_secret',
    })
    resetConnectionForTests()
    expect(getConnection()).toEqual({ tenant: 'acme', key: 'vk_abcd1234_secret' })
    expect(localStorage.getItem('rb-connection')).toBeNull()
  })

  it('el id no expone la key completa', () => {
    expect(connectionId({ tenant: 'acme', key: 'vk_abcd1234_super-secret' })).toBe('tenant:acme:vk_abcd1234')
  })

  it('con storage bloqueado vale en memoria y no falla', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    expect(() => setConnection({ tenant: 'acme', key: 'vk_x_y' })).not.toThrow()
    expect(getConnection()).toEqual({ tenant: 'acme', key: 'vk_x_y' })
    resetConnectionForTests()
    expect(getConnection()).toBeNull()
  })

  it('ignora un valor guardado inválido', () => {
    sessionStorage.setItem('rb-connection', '{"tenant": 3}')
    resetConnectionForTests()
    expect(getConnection()).toBeNull()
  })
})

import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { setConnection, type Connection } from '../data/connection'
import { loadDataset } from '../data/source'
import { navigate } from './route'
import styles from './ConnectionDialog.module.css'

interface Props {
  current: Connection | null
  onClose: () => void
  /** Para tests: valida la conexión (por defecto, pidiendo el dataset). */
  validate?: (connection: Connection) => Promise<unknown>
}

const TENANT_RE = /^[a-z0-9][a-z0-9-]{1,62}$/

/** Conectar el dashboard a un portfolio real (tenant + API key) o volver a la demo. */
export function ConnectionDialog({ current, onClose, validate = loadDataset }: Props) {
  const [tenant, setTenant] = useState(current?.tenant ?? '')
  const [key, setKey] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const first = useRef<HTMLInputElement>(null)
  const titleId = useId()

  useEffect(() => {
    first.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function apply(next: Connection | null) {
    navigate('#/dashboard')
    setConnection(next)
    onClose()
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    const next = { tenant: tenant.trim(), key: key.trim() }
    if (!TENANT_RE.test(next.tenant)) {
      setError('El portfolio es un slug: minúsculas, números y guiones')
      return
    }
    if (!next.key) {
      setError('Ingresá la API key del portfolio')
      return
    }
    setBusy(true)
    setError('')
    try {
      await validate(next)
      apply(next)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
      setBusy(false)
    }
  }

  return (
    <div className={styles.backdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} onSubmit={onSubmit}>
        <h2 id={titleId} className={styles.title}>
          Fuente de datos
        </h2>
        <p className={styles.note}>
          {current ? (
            <>
              Conectado al portfolio <b>{current.tenant}</b>.
            </>
          ) : (
            'Estás viendo el dataset de demo.'
          )}{' '}
          Para ver un portfolio real, ingresá su slug y una API key. Usá una key de <b>sólo lectura</b>: queda
          guardada en esta pestaña hasta que la cierres.
        </p>
        <label className={styles.field}>
          <span>Portfolio</span>
          <input
            ref={first}
            value={tenant}
            onChange={(e) => setTenant(e.target.value)}
            placeholder="falabella"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        <label className={styles.field}>
          <span>API key</span>
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="vk_…"
            autoComplete="off"
            spellCheck={false}
          />
        </label>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.actions}>
          {current && (
            <button type="button" className={styles.secondary} onClick={() => apply(null)}>
              Usar demo
            </button>
          )}
          <button type="button" className={styles.secondary} onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className={styles.primary} disabled={busy}>
            {busy ? 'Conectando…' : 'Conectar'}
          </button>
        </div>
      </form>
    </div>
  )
}

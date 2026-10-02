// Gates de PR del repo (add-github-pr-gate): el último veredicto de cada PR y, con una key que
// puede aprobar gates, «Aprobar» (motivo obligatorio) y «Revocar». Sólo con un portfolio
// conectado: en demo no hay PRs.
import { useCallback, useEffect, useState } from 'react'
import { Card } from '../../components/Card'
import { Pill } from '../../components/Pill'
import { SectionLabel } from '../../components/SectionLabel'
import type { Connection } from '../../data/connection'
import { STATE_LABEL, approveGate, blockingLabel, listGates, revokeOverride } from '../../data/gates'
import { getKeyInfo } from '../../data/jobs'
import type { KeyInfo, PrGate } from '../../data/types'
import styles from './PullRequestsPanel.module.css'

export const NO_PERMISSION_MSG = 'la key no puede aprobar gates'
export const PENDING_STATUS_MSG = 'El check de GitHub se actualizará en la próxima corrida del gate.'

const COLORS: Record<PrGate['state'], { bg: string; fg: string }> = {
  pass: { bg: '#e3f4ec', fg: '#0d6b45' },
  blocked: { bg: '#fde4e4', fg: '#a3141c' },
  approved: { bg: '#fff1d6', fg: '#8a5300' },
  error: { bg: '#ececec', fg: '#444' },
}

const when = (iso: string) => {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })
}

export function PullRequestsPanel({ slug, connection }: { slug: string; connection: Connection }) {
  const [gates, setGates] = useState<PrGate[] | null>(null)
  const [key, setKey] = useState<KeyInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState<number | null>(null)
  const [approving, setApproving] = useState<number | null>(null)
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const load = useCallback(() => {
    listGates(connection, slug).then(
      (g) => {
        setGates(g)
        setError(null)
      },
      (e: unknown) => setError(e instanceof Error ? e.message : String(e)),
    )
  }, [connection, slug])

  useEffect(() => {
    load()
    getKeyInfo(connection).then(setKey, () => setKey(null))
  }, [connection, load])

  const canApprove = !!key?.approveGates

  const approve = async (pr: number) => {
    setBusy(true)
    try {
      const out = await approveGate(connection, slug, pr, reason.trim())
      setNotice(out.statusPublished ? `PR #${pr} aprobada.` : `PR #${pr} aprobada. ${PENDING_STATUS_MSG}`)
      setApproving(null)
      setReason('')
      load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  const revoke = async (pr: number, id: string) => {
    setBusy(true)
    try {
      await revokeOverride(connection, slug, pr, id)
      setNotice(`Aprobación de la PR #${pr} revocada.`)
      load()
    } catch (e) {
      setNotice(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  if (error) {
    return (
      <Card pad="lg" className={styles.panel} data-testid="pull-requests">
        <SectionLabel>Pull Requests</SectionLabel>
        <p className={styles.note}>No se pudieron leer los gates de PR: {error}</p>
      </Card>
    )
  }
  if (!gates || gates.length === 0) return null

  return (
    <Card pad="lg" className={styles.panel} data-testid="pull-requests">
      <SectionLabel>Pull Requests</SectionLabel>
      {notice && (
        <p className={styles.notice} role="status">
          {notice}
        </p>
      )}
      <ul className={styles.list}>
        {gates.map((g) => {
          const keys = g.latest.blocking
          const expanded = open === g.pr
          return (
            <li key={g.pr} className={styles.row} data-pr={g.pr}>
              <div className={styles.head}>
                <button type="button" className={styles.toggle} onClick={() => setOpen(expanded ? null : g.pr)} aria-expanded={expanded}>
                  #{g.pr}
                </button>
                {g.prUrl ? (
                  <a href={g.prUrl} target="_blank" rel="noreferrer" className={styles.branch}>
                    {g.branch ?? 'PR'}
                  </a>
                ) : (
                  <span className={styles.branch}>{g.branch ?? ''}</span>
                )}
                <code className={styles.sha}>{(g.latest.headSha ?? '').slice(0, 7)}</code>
                <Pill bg={COLORS[g.state].bg} fg={COLORS[g.state].fg}>
                  {STATE_LABEL[g.state]}
                </Pill>
                {keys.length > 0 && <span className={styles.count}>{keys.length} bloqueante(s)</span>}
                <span className={styles.date}>{when(g.latest.startedAt)}</span>
              </div>
              {g.state === 'approved' && g.override && (
                <p className={styles.note}>
                  Aprobada por <strong>{g.override.approvedBy}</strong> ({g.override.source}): {g.override.reason}
                </p>
              )}
              {expanded && keys.length > 0 && (
                <ul className={styles.keys}>
                  {keys.map((k) => (
                    <li key={k}>{blockingLabel(k)}</li>
                  ))}
                </ul>
              )}
              <div className={styles.actions}>
                {g.state === 'blocked' && approving !== g.pr && (
                  <button
                    type="button"
                    disabled={!canApprove || busy}
                    title={canApprove ? undefined : NO_PERMISSION_MSG}
                    onClick={() => {
                      setApproving(g.pr)
                      setOpen(g.pr)
                    }}
                  >
                    Aprobar
                  </button>
                )}
                {g.state === 'blocked' && !canApprove && <span className={styles.note}>{NO_PERMISSION_MSG}</span>}
                {g.state === 'approved' && g.override && (
                  <button
                    type="button"
                    disabled={!canApprove || busy}
                    title={canApprove ? undefined : NO_PERMISSION_MSG}
                    onClick={() => revoke(g.pr, g.override!.id)}
                  >
                    Revocar
                  </button>
                )}
              </div>
              {approving === g.pr && (
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault()
                    if (reason.trim()) void approve(g.pr)
                  }}
                >
                  <label>
                    Motivo (obligatorio): se aprueban los {keys.length} hallazgo(s) de arriba; uno nuevo vuelve a bloquear.
                    <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} required />
                  </label>
                  <div className={styles.actions}>
                    <button type="submit" disabled={busy || !reason.trim()}>
                      Confirmar aprobación
                    </button>
                    <button type="button" onClick={() => setApproving(null)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
            </li>
          )
        })}
      </ul>
    </Card>
  )
}

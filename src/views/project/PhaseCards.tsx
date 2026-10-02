import { useEffect } from 'react'
import { LOCAL_ONLY_MSG } from '../../app/jobRunner'
import { usePhaseRunnerContext } from '../../app/phaseRunner'
import { useStore } from '../../app/store'
import { Donut } from '../../components/Donut'
import type { FixPhaseKey, FleetRepository } from '../../data/types'
import type { LiveEstimate } from '../../domain/estimate'
import { donut, n, phColor, t, usd } from '../../domain/format'
import { isActive } from '../../data/jobs'
import { blockedBy, ORDER, phaseKey, phaseStatus } from '../../domain/phases'
import styles from './PhaseCards.module.css'

interface Props {
  slug: string
  row: FleetRepository
  est: LiveEstimate
  totalVulns: number
  clean: boolean
}

export function PhaseCards({ slug, row, est, totalVulns, clean }: Props) {
  const { state } = useStore()
  const runner = usePhaseRunnerContext()
  // Con un portfolio real las fases son jobs de la API (ver `jobRunner.ts`).
  const real = runner.real
  useEffect(() => {
    real?.watch(slug)
  }, [real, slug])
  const job = real?.job(slug) ?? null
  const jobActive = isActive(job)
  const statusOf = (k: FixPhaseKey) => phaseStatus(row, k, state.phases[phaseKey(slug, k)])
  const anyRunning = real ? jobActive : ORDER.some((k) => state.phases[phaseKey(slug, k)]?.run)

  const cards = ORDER.map((k, idx) => {
    const rk = phaseKey(slug, k)
    const run = state.phases[rk]
    const st = statusOf(k)
    const live = est.ph[idx + 1]
    const ph = (run?.run || run?.done) && run.snap ? run.snap : { units: live.units, t: live.t, c: live.c, fixes: live.fixes }
    const done = st === 'done'
    const running = st === 'running'
    const pct = done ? 100 : run?.pct || (running ? 45 : 0)
    const na = st === 'not-applicable' || (!live.t && !ph.t)
    // En modo real no hay orden obligatorio entre fases (el job ya las ordena).
    const blocker = real ? null : blockedBy(statusOf, k)
    const reason = real && !na ? real.blockReason(slug, [k]) : null
    const off = na || (real ? !!reason : done) || !!blocker
    const label = run?.label
    return {
      key: k,
      units: na ? 'sin unidades en este repo' : ph.units,
      fixes: na ? '—' : n(ph.fixes),
      time: na ? '—' : t(ph.t),
      cost: na ? '—' : usd(ph.c),
      pct: na ? '—' : pct + '%',
      pctN: na ? 0 : pct,
      ring: donut(na ? 0 : pct, done ? 'var(--teal)' : 'var(--red)'),
      stateLabel: na
        ? 'no aplica'
        : label && (running || done || run?.failed)
          ? label
          : done
            ? 'completado'
            : running
              ? 'en curso'
              : blocker
                ? 'en espera de ' + blocker
                : 'pendiente',
      stateColor: na ? 'var(--fg3)' : run?.failed ? 'var(--bordo)' : phColor(st),
      msg: run?.msg || '',
      btnLabel: na
        ? 'Sin trabajo pendiente'
        : running
          ? label === 'en cola' || label === 'en espera'
            ? 'En cola…'
            : 'Ejecutando… ' + pct + '%'
          : real
            ? run?.failed
              ? 'Reintentar ' + k
              : done
                ? 'Ejecutar ' + k + ' de nuevo'
                : 'Ejecutar ' + k
            : done
              ? 'Ejecutada'
              : blocker
                ? 'Requiere ' + blocker
                : 'Ejecutar ' + k,
      reason,
      off,
      done,
      snap: ph,
      disabled: real ? na || running || !!reason : na || done || running || !!blocker || anyRunning,
    }
  })

  const doneCards = cards.filter((c) => c.done)
  const accT = doneCards.reduce((a, c) => a + c.snap.t, 0)
  const accC = doneCards.reduce((a, c) => a + c.snap.c, 0)
  const open = totalVulns - doneCards.reduce((a, c) => a + c.snap.fixes, 0)

  const allDone = ORDER.every((k) => {
    const st = statusOf(k)
    return st === 'done' || st === 'not-applicable'
  })
  const after = [
    {
      k: 'Estado después de la remediación',
      v: clean
        ? 'nada para remediar'
        : allDone
          ? real
            ? 'commits locales · sin push'
            : 'PR abierto · pendiente de QA'
          : 'en curso',
      color: allDone && !clean ? 'var(--teal)' : 'var(--fg3)',
    },
    { k: 'Vulnerabilidades abiertas', v: clean ? '0' : n(open) + ' de ' + n(totalVulns), color: 'var(--fg)' },
    { k: 'Fix ejecutado (estimado)', v: accT ? t(accT) : '—', color: 'var(--fg)' },
    { k: 'Costo ejecutado (estimado)', v: accT ? usd(accC) : '—', color: 'var(--fg)' },
  ]

  return (
    <>
      <section className={styles.section}>
        <div className={styles.titleRow}>
          <h2 className={styles.h2}>Fases de remediación</h2>
          <span className={styles.note}>
            {row.reviewSeconds
              ? 'review ejecutada en ' + t(row.reviewSeconds) + ' · las tres fases siguientes se ejecutan por separado'
              : 'el review no encontró vulnerabilidades: no hay fases de fix para ejecutar'}
          </span>
          <span className={styles.seq}>se ejecutan en secuencia: fixdeps → fixcode → fixsecrets</span>
        </div>
        {real && (
          <div className={styles.jobBar}>
            <span className={styles.localOnly}>{LOCAL_ONLY_MSG}</span>
            {job?.status === 'queued' && (
              <button type="button" className={styles.cancel} onClick={() => real.cancel(slug)}>
                Cancelar job en cola
              </button>
            )}
            {real.error(slug) && (
              <span role="alert" className={styles.jobError}>
                {real.error(slug)}
              </span>
            )}
          </div>
        )}
        <div data-tour="fases" className={styles.cards}>
          {cards.map((c) => (
            <div key={c.key} className={styles.card} data-phase={c.key}>
              <div className={styles.top}>
                <Donut background={c.ring} size={84} hole={64} label={c.key + ': ' + c.stateLabel + ' · ' + c.pct}>
                  <span className={styles.pct}>{c.pct}</span>
                </Donut>
                <div className={styles.meta}>
                  <span className={styles.key}>{c.key}</span>
                  <span className={styles.units}>{c.units}</span>
                  <span className={styles.state} style={{ color: c.stateColor }}>
                    {c.stateLabel}
                  </span>
                </div>
              </div>
              <div className={styles.stats}>
                <div>
                  <span>Corrige</span>
                  <b>{c.fixes}</b>
                </div>
                <div>
                  <span>Tiempo</span>
                  <b>{c.time}</b>
                </div>
                <div>
                  <span>Costo</span>
                  <b>{c.cost}</b>
                </div>
              </div>
              <div className={styles.progress}>
                <div className={styles.bar}>
                  <i style={{ background: c.stateColor, width: c.pctN + '%' }} />
                </div>
                <span className={styles.msg}>{c.msg}</span>
              </div>
              <button
                type="button"
                className={styles.btn}
                data-off={c.off || undefined}
                disabled={c.disabled}
                title={c.reason || undefined}
                onClick={() => runner.start(slug, c.key)}
              >
                {c.btnLabel}
              </button>
              {c.reason && !jobActive && (
                <span className={styles.reason}>{c.reason}</span>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className={styles.after}>
        {after.map((a) => (
          <div key={a.k} className={styles.afterItem}>
            <span>{a.k}</span>
            <span className={styles.afterValue} style={{ color: a.color }}>
              {a.v}
            </span>
          </div>
        ))}
      </section>
    </>
  )
}

import { createPortal } from 'react-dom'
import type { TourState } from '../app/store'
import { ACTS } from './steps'
import type { TourEngine } from './useTourEngine'
import styles from './TourOverlay.module.css'

export function TourOverlay({ tour: T, engine }: { tour: TourState; engine: TourEngine }) {
  if (!T.on) return null
  const steps = engine.steps
  const step = steps[T.i] || steps[0]
  const kiosk = T.kiosk
  const shown = kiosk ? steps.length : steps.filter((x) => !x.closing).length
  const eyebrow = ACTS[step.act] + ' · paso ' + Math.min(T.i + 1, shown) + ' de ' + shown
  const dur = (step.seconds || 10) / 2
  const progress = Math.round(((T.i + Math.min(1, (T.elapsed || 0) / dur)) / shown) * 100) + '%'
  const frac = kiosk || !T.paused ? Math.min(1, (T.elapsed || 0) / dur) : 0
  const deg = Math.round(frac * 360)
  const stepRing = `conic-gradient(var(--red) 0deg ${deg}deg, var(--line) ${deg}deg 360deg)`

  const controls = [
    { label: '‹ Anterior', act: engine.prev, variant: 'default' },
    { label: T.paused ? 'Reanudar' : 'Pausar', act: engine.togglePause, variant: 'default' },
    { label: 'Siguiente ›', act: engine.next, variant: 'primary', ring: true },
    { label: 'Salir', act: engine.exit, variant: 'ghost' },
  ] as const
  const renderControls = () =>
    controls.map((c) => (
      <button key={c.label} type="button" className={styles.control} data-variant={c.variant} onClick={c.act}>
        {'ring' in c && <i className={styles.stepRing} style={{ background: stepRing }} />}
        {c.label}
      </button>
    ))

  return createPortal(
    <div className={styles.root} data-kiosk={kiosk || undefined}>
      <div
        aria-hidden="true"
        className={styles.spot}
        style={{
          left: (T.spot?.x ?? 0) + 'px',
          top: (T.spot?.y ?? 0) + 'px',
          width: (T.spot?.w ?? 0) + 'px',
          height: (T.spot?.h ?? 0) + 'px',
          opacity: T.spot ? 1 : 0,
        }}
      />

      {step.plate && (
        <div role="dialog" aria-live="polite" aria-label={step.title} className={styles.plate}>
          <div className={styles.plateInner}>
            <span className={styles.eyebrow}>{eyebrow}</span>
            <h2 className={styles.plateTitle}>{step.title}</h2>
            <span className={styles.plateRule} />
            <p className={styles.plateBody}>{step.body}</p>
            {step.diagram && (
              <div className={styles.diagram}>
                {step.diagram.map(([label, color], i) => (
                  <div key={label} className={styles.node}>
                    <div className={styles.nodeBox} style={{ borderColor: color, color }}>
                      {label}
                    </div>
                    <span className={styles.arrow}>{i < step.diagram!.length - 1 ? '→' : ''}</span>
                  </div>
                ))}
              </div>
            )}
            <div className={styles.controls}>{renderControls()}</div>
          </div>
        </div>
      )}

      {!step.plate && T.spot && T.bubble && (
        <div
          role="dialog"
          aria-live="polite"
          aria-label={step.title}
          tabIndex={-1}
          className={styles.bubble}
          style={{ left: T.bubble.x + 'px', top: T.bubble.y + 'px', width: T.bubble.w + 'px' }}
        >
          <span className={styles.eyebrow}>{eyebrow}</span>
          <span className={styles.title}>{step.title}</span>
          <span className={styles.body}>{step.body}</span>
          <div className={styles.controls}>{renderControls()}</div>
        </div>
      )}

      <div className={styles.bar}>
        <div style={{ width: progress }} />
      </div>
    </div>,
    document.body,
  )
}

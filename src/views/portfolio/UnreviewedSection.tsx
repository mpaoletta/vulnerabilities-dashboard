import { useEffect } from 'react'
import { useReviewRunnerContext } from '../../app/reviewRunner'
import { Card } from '../../components/Card'
import { ReviewControls } from '../../components/ReviewControls'
import { SectionLabel } from '../../components/SectionLabel'
import layout from '../shared/layout.module.css'
import styles from './PortfolioView.module.css'

/** Mientras el portfolio está a la vista, el listado se relee cada tanto (un clone nuevo aparece solo). */
export const UNREVIEWED_REFRESH_MS = 15000

/** «Sin review»: clones de los workers en línea (y repos registrados) que todavía no tienen review. */
export function UnreviewedSection() {
  const runner = useReviewRunnerContext()
  const refresh = runner?.refresh

  useEffect(() => {
    if (!refresh) return
    refresh()
    const id = setInterval(refresh, UNREVIEWED_REFRESH_MS)
    return () => clearInterval(id)
  }, [refresh])

  if (!runner || runner.items.length === 0) return null
  return (
    <Card as="section" pad="md" data-tour="sin-review" className={styles.unreviewed}>
      <div className={layout.head}>
        <SectionLabel>Sin review</SectionLabel>
        <span className={layout.note}>clonados en un worker, todavía sin analizar</span>
      </div>
      <ul className={styles.unreviewedList}>
        {runner.items.map((item) => (
          <li key={item.slug} className={styles.unreviewedItem}>
            <span className={styles.slug}>{item.slug}</span>
            <span className={styles.unreviewedWorkers}>
              {item.workers.length
                ? 'en ' + item.workers.map((w) => w.hostname || w.workerId).join(', ')
                : 'ningún worker en línea lo tiene'}
            </span>
            <ReviewControls runner={runner} slug={item.slug} />
          </li>
        ))}
      </ul>
    </Card>
  )
}

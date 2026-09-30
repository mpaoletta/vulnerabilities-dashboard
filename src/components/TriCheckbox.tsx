import styles from './TriCheckbox.module.css'

export type TriState = 'none' | 'some' | 'all'

interface Props {
  state: TriState
  /** Grupo sin ítems seleccionables (p. ej. Residual). */
  empty?: boolean
  label: string
  onToggle: () => void
}

/** Checkbox de grupo de 15px: vacío / «–» parcial / «✓» con fondo rojo. */
export function TriCheckbox({ state, empty, label, onToggle }: Props) {
  const mark = empty ? '' : state === 'all' ? '✓' : state === 'some' ? '–' : ''
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={empty ? false : state === 'all' ? true : state === 'some' ? 'mixed' : false}
      aria-label={label}
      disabled={empty}
      onClick={onToggle}
      className={styles.box}
      data-state={empty ? 'empty' : state}
    >
      {mark}
    </button>
  )
}

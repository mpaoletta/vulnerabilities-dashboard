import type { HTMLAttributes } from 'react'
import styles from './Card.module.css'

type Pad = 'sm' | 'md' | 'lg' | 'none'

interface Props extends HTMLAttributes<HTMLDivElement> {
  pad?: Pad
  as?: 'div' | 'section' | 'aside'
}

/** Tarjeta del DS: borde `--line`, radio 4px, fondo `--card`, sin sombra. */
export function Card({ pad = 'sm', as: Tag = 'div', className, ...rest }: Props) {
  return <Tag className={[styles.card, styles[pad], className].filter(Boolean).join(' ')} {...rest} />
}

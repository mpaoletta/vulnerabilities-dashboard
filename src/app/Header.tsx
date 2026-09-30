import logo from '../assets/abeja-roja.png'
import type { Route } from './route'
import styles from './Header.module.css'

interface Props {
  repositoryCount: number
  route: Route
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  onStartGuide: () => void
  onStartKiosk: () => void
}

const LEGEND = [
  { label: 'hecha', cls: 'done' },
  { label: 'corriendo', cls: 'running' },
  { label: 'pendiente', cls: 'pending' },
  { label: 'no aplica', cls: 'na' },
] as const

export function Header({ repositoryCount, route, theme, onToggleTheme, onStartGuide, onStartKiosk }: Props) {
  const active = route.name === 'remediados' ? 'remediados' : route.name === 'repo' ? null : 'dashboard'
  return (
    <header className={styles.header}>
      <img src={logo} alt="redbee" className={styles.logo} />
      <div className={styles.title}>
        <span className={styles.name}>remediación automatizada de vulnerabilidades</span>
        <span className={styles.sub}>portfolio · {repositoryCount} repositorios · nombres anonimizados</span>
      </div>
      <nav className={styles.nav}>
        <a href="#/dashboard" aria-current={active === 'dashboard' ? 'page' : undefined}>
          Portfolio
        </a>
        <a href="#/remediados" aria-current={active === 'remediados' ? 'page' : undefined}>
          Remediados
        </a>
      </nav>
      <div className={styles.right}>
        <div className={styles.legend}>
          {LEGEND.map((l) => (
            <span key={l.cls}>
              <i className={styles[l.cls]} />
              {l.label}
            </span>
          ))}
        </div>
        <button type="button" className={styles.secondary} data-variant="guide" onClick={onStartGuide}>
          Ver guía
        </button>
        <button type="button" className={styles.primary} onClick={onStartKiosk}>
          Modo demo
        </button>
        <button type="button" className={styles.secondary} onClick={onToggleTheme}>
          {theme === 'dark' ? 'Tema claro' : 'Tema oscuro'}
        </button>
      </div>
    </header>
  )
}

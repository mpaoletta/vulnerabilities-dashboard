// Routing por hash: `#/dashboard`, `#/repo/:slug`, `#/remediados` y `#/tour`.
import { READONLY } from './edition'

export type Route = { name: 'dashboard' } | { name: 'repo'; slug: string } | { name: 'remediados' } | { name: 'tour' }

export function parseHash(hash: string): Route {
  const h = hash || '#/dashboard'
  if (h.indexOf('#/tour') === 0) return { name: 'tour' }
  if (h.indexOf('#/remediados') === 0) return { name: 'remediados' }
  const m = /^#\/repo\/(.+)$/.exec(h)
  if (m) {
    try {
      return { name: 'repo', slug: decodeURIComponent(m[1]) }
    } catch {
      return { name: 'dashboard' }
    }
  }
  return { name: 'dashboard' }
}

export function routeHash(route: Route): string {
  switch (route.name) {
    case 'repo':
      return '#/repo/' + route.slug
    case 'remediados':
      return '#/remediados'
    case 'tour':
      return '#/tour'
    default:
      return '#/dashboard'
  }
}

/**
 * Ruta efectiva: un slug que no está en el dataset cae al Portfolio. En la edición
 * review, `#/remediados` no existe y también cae al Portfolio.
 */
export function resolveRoute(route: Route, hasRepo: (slug: string) => boolean, readonly = READONLY): Route {
  if (route.name === 'repo' && !hasRepo(route.slug)) return { name: 'dashboard' }
  if (route.name === 'remediados' && readonly) return { name: 'dashboard' }
  if (route.name === 'tour') return { name: 'dashboard' }
  return route
}

export function navigate(hash: string): void {
  if (location.hash !== hash) location.hash = hash
}

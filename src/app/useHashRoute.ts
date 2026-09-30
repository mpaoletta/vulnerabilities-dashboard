import { useEffect, useState } from 'react'
import { parseHash, type Route } from './route'

export function useHashRoute(): Route {
  const [route, setRoute] = useState<Route>(() => parseHash(location.hash))
  useEffect(() => {
    const onHash = () => setRoute(parseHash(location.hash))
    window.addEventListener('hashchange', onHash)
    onHash()
    return () => window.removeEventListener('hashchange', onHash)
  }, [])
  return route
}

import { useSyncExternalStore } from 'react'

/**
 * '#/lifespan' -> 'lifespan'. The hub is the empty string. Extra path
 * segments and query strings are ignored — there is only one level of route.
 */
export function parseHash(hash: string): string {
  return hash.replace(/^#\/?/, '').split(/[/?]/)[0]
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getSnapshot(): string {
  return window.location.hash
}

/**
 * The current route id, re-rendering on hashchange. useSyncExternalStore
 * rather than useState+useEffect: no pair of values to keep in sync and no
 * tearing if the hash changes mid-render.
 */
export function useHashRoute(): string {
  return parseHash(useSyncExternalStore(subscribe, getSnapshot, () => ''))
}

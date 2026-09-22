import { Suspense, lazy, useState, type ComponentType } from 'react'
import { GAMES, findGame, type GameMeta } from './games'
import { Hub } from './Hub'
import { useHashRoute } from './router'
import { HowToPlay } from './HowToPlay'
import './platform.css'

type LiveGame = Extract<GameMeta, { status: 'live' }>

/**
 * lazy() must be called once per game, not once per render, or React
 * remounts the game on every keystroke inside it. Keyed on the registry
 * object rather than the id so test fixtures never collide with each other.
 */
const lazyCache = new WeakMap<LiveGame, ComponentType>()

function lazyFor(game: LiveGame): ComponentType {
  let Component = lazyCache.get(game)
  if (!Component) {
    Component = lazy(game.load)
    lazyCache.set(game, Component)
  }
  return Component
}

interface Props {
  /** Defaults to the real registry; tests inject a fixture. */
  games?: GameMeta[]
}

export function Shell({ games = GAMES }: Props) {
  const route = useHashRoute()
  const found = findGame(games, route)

  // An unknown id, or one that isn't built yet, shows the hub rather than a
  // 404 — a stale shared link should degrade, not dead-end.
  const active = found?.status === 'live' ? found : undefined
  const Game = active ? lazyFor(active) : null

  const [helpRoute, setHelpRoute] = useState<string | null>(null)
  const helpOpen = helpRoute === route

  return (
    <div className="shell">
      <header className="shell-header">
        {active ? (
          <>
            <a className="shell-back" href="#/" aria-label="Back to all games">←</a>
            <span className="shell-title">{active.name}</span>
          </>
        ) : (
          <>
            <span className="shell-back" aria-hidden="true" />
            <a className="shell-wordmark" href="#/">MetroWreckLabs</a>
          </>
        )}
        <button
          className="shell-action"
          onClick={() => setHelpRoute(route)}
          aria-label={active ? `How to play ${active.name}` : 'How to play'}
        >
          ⓘ
        </button>
      </header>

      <main className="shell-main">
        {Game ? (
          <Suspense fallback={<p className="shell-loading">Loading…</p>}>
            <Game />
          </Suspense>
        ) : (
          <Hub games={games} />
        )}
      </main>

      {helpOpen && (
        <HowToPlay
          title={active ? active.name : 'MetroWreckLabs'}
          onClose={() => setHelpRoute(null)}
        >
          {active ? active.howToPlay : (
            <p>Pick a game from the list — there's a new puzzle in each one every day.</p>
          )}
        </HowToPlay>
      )}
    </div>
  )
}

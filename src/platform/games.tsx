import type { ComponentType, ReactNode } from 'react'

/** Names of color tokens in styles/tokens.css, used by the 2x2 game tile. */
export type TileToken = 'born' | 'died' | 'border' | 'surface'

interface GameBase {
  /** URL segment: #/<id>. Lowercase, hyphens only. */
  id: string
  name: string
  tagline: string
  tiles: [TileToken, TileToken, TileToken, TileToken]
  howToPlay: ReactNode
}

/**
 * Discriminated so a 'soon' game cannot carry a loader and a 'live' game
 * cannot omit one — the router never has to guard against a missing component.
 */
export type GameMeta =
  | (GameBase & { status: 'live'; load: () => Promise<{ default: ComponentType }> })
  | (GameBase & { status: 'soon' })

export const GAMES: GameMeta[] = [
  {
    id: 'lifespan',
    name: 'Lifespan',
    tagline: 'Two pins, two dates. Who were they?',
    tiles: ['born', 'border', 'border', 'died'],
    status: 'live',
    // Dynamic import: Vite splits the game (with Leaflet and its JSON data)
    // into a chunk that the hub never downloads.
    load: () => import('../games/lifespan/Lifespan'),
    howToPlay: (
      <>
        <p>
          A green pin marks where the mystery person was born, a red pin where
          they died. Their dates are below the map.
        </p>
        <p>
          You get six guesses. Each wrong guess unlocks a hint — first gender
          and nationality, then profession, then initials.
        </p>
        <p>
          Guessing is forgiving: close spellings count, and a name that isn't in
          the game doesn't cost you a guess.
        </p>
      </>
    ),
  },
]

export function findGame(games: GameMeta[], id: string): GameMeta | undefined {
  return games.find((g) => g.id === id)
}

# Platform Shell & Visual Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-game app into a games platform — a hub menu, hash routing, a lazy-loaded game registry, and a white NYT-Games-style visual design — so that adding game 2 costs one folder plus one registry entry.

**Architecture:** `src/platform/` owns the shell (hash router, header, hub, how-to-play modal) and a registry (`games.tsx`) that is the single source of truth for which games exist. Each game is a self-contained folder under `src/games/` loaded via `React.lazy`, so the hub ships 62.8 kB gzip instead of the current 357.6 kB. Styling is driven entirely by CSS custom properties in `src/styles/tokens.css`.

**Tech Stack:** React 19, TypeScript (strict), Vite 6, Vitest 4 + Testing Library, Leaflet / react-leaflet. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-22-platform-shell-design.md`

## Global Constraints

- **No new dependencies.** Routing is hand-rolled; fonts are system/Georgia; no webfonts.
- **Baseline to preserve:** 46 tests passing (`npm test`), `npm run build` succeeds. Every task ends with both green.
- **Colors and fonts come only from tokens** in `src/styles/tokens.css`. No hex literals in component CSS or TSX after Task 7, with three sanctioned exceptions: `MapView.tsx` (Leaflet takes colors as JS options and cannot read CSS variables — it uses an exported `MAP_COLORS` constant instead), the modal scrim's `rgba()` in `platform.css` (an alpha overlay, not a palette color), and `public/favicon.svg` (a static file outside the CSS cascade).
- **Contrast floor:** all text carrying meaning uses `--text` (#111111) or `--muted` (#6e7276, 4.8:1 on white). `--disabled` (#a0a4a8) is only for non-informative marks (em-dashes, dividers). Never apply blanket `opacity` to a row containing text.
- **Copy:** the platform is `MetroWreckLabs`; game 1 is `Lifespan` with tagline `Two pins, two dates. Who were they?`
- **Game id / URL:** `lifespan`, reached at `#/lifespan`.
- **TypeScript is strict with `noUnusedLocals` and `noUnusedParameters`.** Unused imports fail `npm run build`.
- **Existing tests must not be modified** except where a task explicitly says so.
- **Real hint ladder (do not invent hint names in UI copy):** `HINT_ORDER` is `['origin', 'profession', 'initials']` — three hints, not five. `MAX_GUESSES` is 6.

---

### Task 1: Move the game into its own module

Pure refactor. Nothing about behavior or appearance changes. Because every import inside the game is relative and the directories move *together*, no import path inside the game needs editing.

**Files:**
- Move: `src/components/` → `src/games/lifespan/components/` (6 components + 2 tests)
- Move: `src/game/` → `src/games/lifespan/game/` (7 modules + 6 tests)
- Move: `src/data/` → `src/games/lifespan/data/`
- Move: `src/App.tsx` → `src/games/lifespan/Lifespan.tsx`
- Move: `src/App.css` → `src/games/lifespan/lifespan.css`
- Modify: `src/main.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `src/games/lifespan/Lifespan.tsx` with `export default function Lifespan()`. Task 3's registry imports it as `() => import('../games/lifespan/Lifespan')`.

- [ ] **Step 1: Confirm the baseline before touching anything**

Run: `npm test`
Expected: `Test Files 8 passed (8)`, `Tests 46 passed (46)`

Run: `npm run build`
Expected: `✓ built`, with `index-*.js` around `1,359 kB`. Note this number — Task 5 compares against it.

- [ ] **Step 2: Move the directories with git mv**

```bash
mkdir -p src/games/lifespan
git mv src/components src/games/lifespan/components
git mv src/game src/games/lifespan/game
git mv src/data src/games/lifespan/data
git mv src/App.tsx src/games/lifespan/Lifespan.tsx
git mv src/App.css src/games/lifespan/lifespan.css
```

- [ ] **Step 3: Update the three lines inside Lifespan.tsx that name themselves**

In `src/games/lifespan/Lifespan.tsx`, change only these. Leave every other line alone — all the `./components/...`, `./game/...` and `./data/...` paths are still correct.

Change the CSS import and add Leaflet's stylesheet (it moves here from `main.tsx` so it lands in the lazy chunk rather than the hub's):

```tsx
import './lifespan.css'
import 'leaflet/dist/leaflet.css'
```

Rename the default export:

```tsx
export default function Lifespan() {
```

- [ ] **Step 4: Point main.tsx at the moved file**

Replace the whole of `src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import Lifespan from './games/lifespan/Lifespan'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Lifespan />
  </StrictMode>,
)
```

Note `leaflet/dist/leaflet.css` is deliberately gone from here — Step 3 moved it into the game.

- [ ] **Step 5: Verify nothing broke**

Run: `npm test`
Expected: `Tests 46 passed (46)` — identical to Step 1. If any test fails, a directory did not move as a unit; check the failing import path.

Run: `npm run build`
Expected: `✓ built`, bundle size within a few hundred bytes of Step 1.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: move the game into src/games/lifespan

Pure directory move ahead of the platform shell. Every import inside the
game is relative, so moving the directories together needs no path edits.
Leaflet's stylesheet moves from main.tsx into the game so it will land in
the game's lazy chunk rather than the hub's bundle."
```

---

### Task 2: Hash router

**Files:**
- Create: `src/platform/router.ts`
- Test: `src/platform/router.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `parseHash(hash: string): string` — pure, exported for testing.
  - `useHashRoute(): string` — returns the bare route id (`''` for the hub). Used by `Shell` in Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/platform/router.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { parseHash, useHashRoute } from './router'

describe('parseHash', () => {
  it('extracts the id from a rooted hash', () => {
    expect(parseHash('#/lifespan')).toBe('lifespan')
  })

  it('accepts a hash without the slash', () => {
    expect(parseHash('#lifespan')).toBe('lifespan')
  })

  it('returns empty string for the hub', () => {
    expect(parseHash('')).toBe('')
    expect(parseHash('#')).toBe('')
    expect(parseHash('#/')).toBe('')
  })

  it('ignores extra segments and query strings', () => {
    expect(parseHash('#/lifespan/archive')).toBe('lifespan')
    expect(parseHash('#/lifespan?debug=1')).toBe('lifespan')
  })
})

describe('useHashRoute', () => {
  it('reports the current hash', () => {
    window.location.hash = '#/lifespan'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current).toBe('lifespan')
  })

  it('re-renders when the hash changes', () => {
    window.location.hash = '#/'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current).toBe('')

    act(() => {
      window.location.hash = '#/lifespan'
      window.dispatchEvent(new Event('hashchange'))
    })

    expect(result.current).toBe('lifespan')
  })
})
```

The explicit `dispatchEvent` is belt-and-braces: jsdom's `hashchange` firing is asynchronous, and the store's snapshot is idempotent so a duplicate event is harmless.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/platform/router.test.ts`
Expected: FAIL — `Failed to resolve import "./router"`

- [ ] **Step 3: Write the implementation**

Create `src/platform/router.ts`:

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/platform/router.test.ts`
Expected: PASS, 6 tests

Run: `npm test`
Expected: `Tests 52 passed (52)`

- [ ] **Step 5: Commit**

```bash
git add src/platform/router.ts src/platform/router.test.ts
git commit -m "feat: hash router for the platform shell"
```

---

### Task 3: Game registry

The registry is the single source of truth for which games exist. A discriminated union makes "a coming-soon game has no component" a type error rather than a runtime guard.

**Files:**
- Create: `src/platform/games.tsx`
- Test: `src/platform/games.test.tsx`

Note the `.tsx` extension on both — the registry holds JSX for `howToPlay`.

**Interfaces:**
- Consumes: `src/games/lifespan/Lifespan.tsx` default export (Task 1).
- Produces:
  - `type TileToken = 'born' | 'died' | 'border' | 'surface'`
  - `type GameMeta` — discriminated on `status: 'live' | 'soon'`; `live` carries `load: () => Promise<{ default: ComponentType }>`
  - `const GAMES: GameMeta[]`
  - `findGame(games: GameMeta[], id: string): GameMeta | undefined`
  - Used by `Hub` (Task 4) and `Shell` (Task 5).

- [ ] **Step 1: Write the failing test**

Create `src/platform/games.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { GAMES, findGame, type GameMeta } from './games'

describe('GAMES registry', () => {
  // Several tests below assert inside a loop over GAMES; without this they
  // would pass vacuously on an empty registry.
  it('is not empty', () => {
    expect(GAMES.length).toBeGreaterThan(0)
  })

  it('has unique ids', () => {
    const ids = GAMES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has URL-safe ids', () => {
    for (const g of GAMES) expect(g.id).toMatch(/^[a-z0-9-]+$/)
  })

  it('gives every live game a loader', () => {
    for (const g of GAMES) {
      if (g.status === 'live') expect(typeof g.load).toBe('function')
    }
  })

  it('gives every game exactly four tile colors', () => {
    for (const g of GAMES) expect(g.tiles).toHaveLength(4)
  })

  it('gives every game display copy', () => {
    for (const g of GAMES) {
      expect(g.name.length).toBeGreaterThan(0)
      expect(g.tagline.length).toBeGreaterThan(0)
      expect(g.howToPlay).toBeTruthy()
    }
  })

  it('includes lifespan as a live game', () => {
    const lifespan = findGame(GAMES, 'lifespan')
    expect(lifespan?.name).toBe('Lifespan')
    expect(lifespan?.status).toBe('live')
  })
})

describe('findGame', () => {
  const games: GameMeta[] = [
    {
      id: 'alpha', name: 'Alpha', tagline: 'First', status: 'soon',
      tiles: ['born', 'border', 'border', 'died'], howToPlay: <p>rules</p>,
    },
  ]

  it('finds a game by id', () => {
    expect(findGame(games, 'alpha')?.name).toBe('Alpha')
  })

  it('returns undefined for an unknown id', () => {
    expect(findGame(games, 'nope')).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/platform/games.test.tsx`
Expected: FAIL — `Failed to resolve import "./games"`

- [ ] **Step 3: Write the implementation**

Create `src/platform/games.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/platform/games.test.tsx`
Expected: PASS, 9 tests

Run: `npm test`
Expected: `Tests 61 passed (61)`

- [ ] **Step 5: Commit**

```bash
git add src/platform/games.tsx src/platform/games.test.tsx
git commit -m "feat: game registry as the single source of truth for games"
```

---

### Task 4: Game tile and hub

**Files:**
- Create: `src/platform/GameTile.tsx`
- Create: `src/platform/Hub.tsx`
- Test: `src/platform/Hub.test.tsx`

**Interfaces:**
- Consumes: `GameMeta`, `TileToken`, `GAMES` from Task 3.
- Produces:
  - `GameTile({ tiles, dimmed? })`
  - `Hub({ games?, today? })` — both props default to the real registry and `new Date()`; tests inject fixtures. Used by `Shell` in Task 5.

- [ ] **Step 1: Write the failing test**

Create `src/platform/Hub.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hub } from './Hub'
import type { GameMeta } from './games'

const games: GameMeta[] = [
  {
    id: 'alpha', name: 'Alpha', tagline: 'The first game', status: 'live',
    tiles: ['born', 'border', 'border', 'died'], howToPlay: <p>alpha rules</p>,
    load: async () => ({ default: () => <p>alpha game</p> }),
  },
  {
    id: 'beta', name: 'Beta', tagline: 'Not yet', status: 'soon',
    tiles: ['border', 'border', 'border', 'border'], howToPlay: <p>beta rules</p>,
  },
]

describe('Hub', () => {
  it('renders a row per registry entry', () => {
    render(<Hub games={games} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('shows each game tagline', () => {
    render(<Hub games={games} />)
    expect(screen.getByText('The first game')).toBeInTheDocument()
    expect(screen.getByText('Not yet')).toBeInTheDocument()
  })

  it('links a live game to its hash route', () => {
    render(<Hub games={games} />)
    expect(screen.getByRole('link', { name: /Play Alpha/i })).toHaveAttribute('href', '#/alpha')
  })

  it('does not make a coming-soon game clickable', () => {
    render(<Hub games={games} />)
    expect(screen.queryByRole('link', { name: /Beta/i })).not.toBeInTheDocument()
    expect(screen.getByText('Soon')).toBeInTheDocument()
  })

  it('shows the injected date in the hero', () => {
    render(<Hub games={games} today={new Date(2026, 8, 22)} />)
    expect(screen.getByText('September 22, 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Daily puzzles' })).toBeInTheDocument()
  })
})
```

Note the link's accessible name is `Play Alpha`, not `Play` — with several games on the hub, five identical "Play" links would be useless to a screen-reader user. The visible text stays `Play`; the game name is added via `aria-label`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/platform/Hub.test.tsx`
Expected: FAIL — `Failed to resolve import "./Hub"`

- [ ] **Step 3: Write GameTile**

Create `src/platform/GameTile.tsx`:

```tsx
import type { TileToken } from './games'

interface Props {
  tiles: [TileToken, TileToken, TileToken, TileToken]
  dimmed?: boolean
}

/**
 * The 2x2 square that identifies a game, in the spirit of NYT Games' icons.
 * Decorative — the game's name sits next to it — so it is hidden from
 * assistive tech rather than described.
 */
export function GameTile({ tiles, dimmed = false }: Props) {
  return (
    <span className={dimmed ? 'game-tile dimmed' : 'game-tile'} aria-hidden="true">
      {tiles.map((token, i) => (
        <i key={i} style={{ background: `var(--${token})` }} />
      ))}
    </span>
  )
}
```

- [ ] **Step 4: Write Hub**

Create `src/platform/Hub.tsx`:

```tsx
import { GAMES, type GameMeta } from './games'
import { GameTile } from './GameTile'

interface Props {
  /** Defaults to the real registry; tests inject a fixture. */
  games?: GameMeta[]
  /** Injectable so the hero date is deterministic under test. */
  today?: Date
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}

export function Hub({ games = GAMES, today = new Date() }: Props) {
  return (
    <div className="hub">
      <div className="hub-hero">
        <h1>Daily puzzles</h1>
        <p>{today.toLocaleDateString('en-US', DATE_FORMAT)}</p>
      </div>

      <ul className="hub-list">
        {games.map((game) => (
          <li key={game.id} className={game.status === 'soon' ? 'hub-row soon' : 'hub-row'}>
            <GameTile tiles={game.tiles} dimmed={game.status === 'soon'} />

            <div className="hub-row-text">
              <h2>{game.name}</h2>
              <p>{game.tagline}</p>
            </div>

            {game.status === 'live' ? (
              <a className="hub-play" href={`#/${game.id}`} aria-label={`Play ${game.name}`}>
                Play
              </a>
            ) : (
              <span className="hub-soon">Soon</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/platform/Hub.test.tsx`
Expected: PASS, 5 tests

Run: `npm test`
Expected: `Tests 66 passed (66)`

- [ ] **Step 6: Commit**

```bash
git add src/platform/GameTile.tsx src/platform/Hub.tsx src/platform/Hub.test.tsx
git commit -m "feat: hub menu rendered from the game registry"
```

---

### Task 5: Shell and routing

This is the task that makes the app a platform. It also strips the game's own page chrome, since the Shell now owns it.

**Files:**
- Create: `src/platform/Shell.tsx`
- Test: `src/platform/Shell.test.tsx`
- Modify: `src/main.tsx`
- Modify: `src/games/lifespan/Lifespan.tsx` (remove the `<h1>` and outer wrapper)

**Interfaces:**
- Consumes: `useHashRoute` (Task 2); `GAMES`, `findGame`, `GameMeta` (Task 3); `Hub` (Task 4).
- Produces: `Shell({ games? })`. Task 6 adds the modal to it; Task 7 styles it.

- [ ] **Step 1: Write the failing test**

Create `src/platform/Shell.test.tsx`:

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Shell } from './Shell'
import type { GameMeta } from './games'

const games: GameMeta[] = [
  {
    id: 'alpha', name: 'Alpha', tagline: 'The first game', status: 'live',
    tiles: ['born', 'border', 'border', 'died'], howToPlay: <p>alpha rules</p>,
    load: async () => ({ default: () => <p>alpha game body</p> }),
  },
  {
    id: 'beta', name: 'Beta', tagline: 'Not yet', status: 'soon',
    tiles: ['border', 'border', 'border', 'border'], howToPlay: <p>beta rules</p>,
  },
]

function setHash(hash: string) {
  window.location.hash = hash
}

describe('Shell', () => {
  beforeEach(() => setHash('#/'))

  it('shows the hub at the root', () => {
    render(<Shell games={games} />)
    expect(screen.getByRole('heading', { name: 'Daily puzzles' })).toBeInTheDocument()
  })

  it('shows the wordmark on the hub', () => {
    render(<Shell games={games} />)
    expect(screen.getByRole('link', { name: 'MetroWreckLabs' })).toHaveAttribute('href', '#/')
  })

  it('falls back to the hub for an unknown route', () => {
    setHash('#/does-not-exist')
    render(<Shell games={games} />)
    expect(screen.getByRole('heading', { name: 'Daily puzzles' })).toBeInTheDocument()
  })

  it('falls back to the hub for a coming-soon game', () => {
    setHash('#/beta')
    render(<Shell games={games} />)
    expect(screen.getByRole('heading', { name: 'Daily puzzles' })).toBeInTheDocument()
  })

  it('loads a live game for its route', async () => {
    setHash('#/alpha')
    render(<Shell games={games} />)
    expect(await screen.findByText('alpha game body')).toBeInTheDocument()
  })

  it('shows the game name and a back link inside a game', async () => {
    setHash('#/alpha')
    render(<Shell games={games} />)
    await screen.findByText('alpha game body')
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to all games/i })).toHaveAttribute('href', '#/')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/platform/Shell.test.tsx`
Expected: FAIL — `Failed to resolve import "./Shell"`

- [ ] **Step 3: Write Shell**

Create `src/platform/Shell.tsx`. The help button is wired in Task 6; for now it is not rendered at all, so no dead control ships.

```tsx
import { Suspense, lazy, type ComponentType } from 'react'
import { GAMES, findGame, type GameMeta } from './games'
import { Hub } from './Hub'
import { useHashRoute } from './router'
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
        <span className="shell-action" />
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
    </div>
  )
}
```

- [ ] **Step 4: Create a placeholder platform.css so the import resolves**

Create `src/platform/platform.css` with exactly this for now — Task 7 fills it in:

```css
/* Shell, hub and modal styling — filled in by the design-system task. */
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/platform/Shell.test.tsx`
Expected: PASS, 6 tests

- [ ] **Step 6: Render the Shell instead of the game**

Replace `src/main.tsx` with:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { Shell } from './platform/Shell'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
)
```

- [ ] **Step 7: Strip the game's own page chrome**

The Shell now draws the wordmark and title, so the game must stop drawing its own. In `src/games/lifespan/Lifespan.tsx`, find this exact block:

```tsx
    <div className="app">
      <header className="app-header">
        <h1>MetroWreckLabs</h1>
        <ModeToggle
          mode={mode}
          onChange={(m) => {
            setMode(m)
            setNotice('')
            const next = m === 'daily' ? daily.person : endlessPerson
            dispatch({ type: 'reset', person: next })
          }}
        />
      </header>
```

and replace it with this — the `<h1>` is gone, the wrapper is renamed, and the
header becomes a mode bar. The `ModeToggle` and its `onChange` body are
unchanged:

```tsx
    <div className="lifespan">
      <div className="lifespan-modes">
        <ModeToggle
          mode={mode}
          onChange={(m) => {
            setMode(m)
            setNotice('')
            const next = m === 'daily' ? daily.person : endlessPerson
            dispatch({ type: 'reset', person: next })
          }}
        />
      </div>
```

The matching `</div>` at the end of the component already closes the outer
wrapper, so no other change is needed.

- [ ] **Step 8: Verify the whole suite and the code split**

Run: `npm test`
Expected: `Tests 72 passed (72)`

Run: `npm run build`
Expected: **two or more JS chunks.** Measured on the real build: entry `index-*.js`
at 198.83 kB raw / 62.60 kB gzip (most of it React's own runtime, which
necessarily lives in the entry), plus a separate `Lifespan-*.js` at 1,163.84 kB
raw / 295.61 kB gzip carrying Leaflet and the JSON data. Leaflet's stylesheet
splits out too, as `Lifespan-*.css` at 17.97 kB.

The gate is that the game's payload is **not** in the entry chunk — the hub's
cost drops from 357.6 kB gzip to 62.8 kB. If there is still only one large
chunk, the dynamic `import()` in `games.tsx` is being defeated: check that
nothing imports `Lifespan` statically (`grep -rn "games/lifespan/Lifespan" src`
should show only the registry's dynamic import).

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: platform shell with hash routing and lazy-loaded games

The hub no longer pays for Lifespan's Leaflet and 1.2MB of JSON: the game
is a separate Vite chunk fetched on navigation. Unknown and coming-soon
routes fall back to the hub rather than 404ing."
```

---

### Task 6: How-to-play modal

**Files:**
- Create: `src/platform/HowToPlay.tsx`
- Test: `src/platform/HowToPlay.test.tsx`
- Modify: `src/platform/Shell.tsx`
- Modify: `src/platform/Shell.test.tsx`

**Interfaces:**
- Consumes: `GameMeta.howToPlay` (Task 3); `Shell` (Task 5).
- Produces: `HowToPlay({ title, children, onClose })`. Game 2 gets this for free by supplying `howToPlay` in its registry entry.

- [ ] **Step 1: Write the failing test**

Create `src/platform/HowToPlay.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HowToPlay } from './HowToPlay'

describe('HowToPlay', () => {
  it('renders as a dialog titled for the game', () => {
    render(<HowToPlay title="Alpha" onClose={() => {}}><p>the rules</p></HowToPlay>)
    expect(screen.getByRole('dialog', { name: /how to play alpha/i })).toBeInTheDocument()
    expect(screen.getByText('the rules')).toBeInTheDocument()
  })

  it('closes on the close button', () => {
    const onClose = vi.fn()
    render(<HowToPlay title="Alpha" onClose={onClose}><p>the rules</p></HowToPlay>)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<HowToPlay title="Alpha" onClose={onClose}><p>the rules</p></HowToPlay>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the backdrop is clicked but not the panel', () => {
    const onClose = vi.fn()
    render(<HowToPlay title="Alpha" onClose={onClose}><p>the rules</p></HowToPlay>)

    fireEvent.click(screen.getByText('the rules'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('modal-scrim'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('moves focus to the close button on open', () => {
    render(<HowToPlay title="Alpha" onClose={() => {}}><p>the rules</p></HowToPlay>)
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/platform/HowToPlay.test.tsx`
Expected: FAIL — `Failed to resolve import "./HowToPlay"`

- [ ] **Step 3: Write HowToPlay**

Create `src/platform/HowToPlay.tsx`:

```tsx
import { useEffect, useRef, type ReactNode } from 'react'

interface Props {
  /** Game name, or the platform name on the hub. */
  title: string
  children: ReactNode
  onClose: () => void
}

export function HowToPlay({ title, children, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    // Focus the close button so keyboard users land inside the dialog.
    closeRef.current?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onClose])

  return (
    <div className="modal-scrim" data-testid="modal-scrim" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-head">
          <h2 id="how-to-play-title">How to play {title}</h2>
          <button ref={closeRef} className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/platform/HowToPlay.test.tsx`
Expected: PASS, 5 tests

- [ ] **Step 5: Add the failing Shell tests for the help button**

Append to the `describe('Shell', ...)` block in `src/platform/Shell.test.tsx`:

```tsx
  it('opens how-to-play for the active game', async () => {
    setHash('#/alpha')
    render(<Shell games={games} />)
    await screen.findByText('alpha game body')

    fireEvent.click(screen.getByRole('button', { name: /how to play/i }))
    expect(screen.getByRole('dialog', { name: /how to play alpha/i })).toBeInTheDocument()
    expect(screen.getByText('alpha rules')).toBeInTheDocument()
  })

  it('opens a platform-level how-to-play on the hub', () => {
    render(<Shell games={games} />)
    fireEvent.click(screen.getByRole('button', { name: /how to play/i }))
    expect(screen.getByRole('dialog', { name: /how to play metrowrecklabs/i })).toBeInTheDocument()
  })
```

Add `fireEvent` to that file's Testing Library import:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
```

- [ ] **Step 6: Run test to verify the two new ones fail**

Run: `npx vitest run src/platform/Shell.test.tsx`
Expected: FAIL on both new tests — `Unable to find an accessible element with the role "button"`

- [ ] **Step 7: Wire the modal into Shell**

In `src/platform/Shell.tsx`, **replace** the existing React import line with the
first line below (it adds `useState`), and add the second as a new import:

```tsx
import { Suspense, lazy, useState, type ComponentType } from 'react'
import { HowToPlay } from './HowToPlay'
```

Inside `Shell`, after the `active` line, add the open state. Storing *which route* the help is open for means navigating away closes it with no effect and no stale-modal bug:

```tsx
  const [helpRoute, setHelpRoute] = useState<string | null>(null)
  const helpOpen = helpRoute === route
```

Replace the empty `<span className="shell-action" />` with:

```tsx
        <button
          className="shell-action"
          onClick={() => setHelpRoute(route)}
          aria-label={active ? `How to play ${active.name}` : 'How to play'}
        >
          ⓘ
        </button>
```

And immediately before the final `</div>`, add:

```tsx
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
```

- [ ] **Step 8: Run tests to verify they pass**

Run: `npx vitest run src/platform/Shell.test.tsx`
Expected: PASS, 8 tests

Run: `npm test`
Expected: `Tests 79 passed (79)`

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: shell-owned how-to-play modal with per-game content"
```

---

### Task 7: Design tokens, base styles, and platform styling

First visual task. The app becomes white here.

**Files:**
- Create: `src/styles/tokens.css`
- Create: `src/styles/base.css`
- Modify: `src/platform/platform.css` (replace the placeholder)
- Modify: `src/main.tsx`
- Delete: `src/index.css`

**Interfaces:**
- Consumes: class names from `Shell`, `Hub`, `GameTile`, `HowToPlay` (Tasks 4–6).
- Produces: the token set every later task draws from.

- [ ] **Step 1: Create the tokens**

Create `src/styles/tokens.css`:

```css
/*
 * Platform design tokens. NYT-Games-inspired: white ground, hairline rules,
 * a serif display face, two ink levels.
 *
 * Contrast note: Wordle's own muted gray (#787c7e) is 4.27:1 on white and
 * fails WCAG AA for body text. --muted is darkened to #6e7276 (4.8:1) and
 * carries ALL secondary text, uppercase labels included. --disabled is for
 * non-informative marks only, never for text that carries meaning.
 */
:root {
  --bg: #ffffff;
  --surface: #f6f7f8;
  --border: #d3d6da;
  --rule: #eceef0;

  --text: #111111;
  --muted: #6e7276;
  --disabled: #a0a4a8;

  --born: #6aaa64;
  --died: #c9433f;

  --land: #dfe3e7;
  --coast: #b9c0c7;

  --font-display: Georgia, 'Times New Roman', serif;
  --font-ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;

  --col: 600px;
  --radius: 8px;
}
```

- [ ] **Step 2: Create the base styles**

Create `src/styles/base.css`:

```css
* { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-ui);
  -webkit-font-smoothing: antialiased;
}

button { font: inherit; cursor: pointer; }
a { color: inherit; text-decoration: none; }

/* Small uppercase label, used for dates, section headers and status. */
.label {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
}
```

- [ ] **Step 3: Write the platform styles**

Replace the whole of `src/platform/platform.css`:

```css
.shell { max-width: var(--col); margin: 0 auto; min-height: 100vh; }

.shell-header {
  display: grid;
  grid-template-columns: 32px 1fr 32px;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--border);
}
.shell-back { font-size: 20px; color: var(--muted); line-height: 1; }
.shell-wordmark,
.shell-title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 17px;
  letter-spacing: -0.3px;
  text-align: center;
}
.shell-action {
  background: none;
  border: 0;
  padding: 0;
  font-size: 15px;
  color: var(--muted);
  justify-self: end;
}
.shell-loading { color: var(--muted); text-align: center; padding: 48px 0; }

/* ---------- hub ---------- */
.hub-hero { text-align: center; padding: 34px 16px 22px; }
.hub-hero h1 {
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: 700;
  margin: 0 0 6px;
}
.hub-hero p { margin: 0; font-size: 13px; color: var(--muted); }

.hub-list { list-style: none; margin: 0; padding: 0 16px 32px; }
.hub-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 2px;
  border-top: 1px solid var(--rule);
}
.hub-row h2 {
  font-family: var(--font-display);
  font-size: 17px;
  font-weight: 700;
  margin: 0 0 3px;
}
.hub-row p { margin: 0; font-size: 12.5px; color: var(--muted); }

/*
 * Coming-soon rows dim the TILE only. A blanket opacity here would push the
 * row's text below the AA contrast floor.
 */
.game-tile {
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  grid-template-rows: repeat(2, 1fr);
  gap: 2px;
}
.game-tile i { display: block; border-radius: 1px; }
.game-tile.dimmed { opacity: 0.35; }

.hub-row-text { min-width: 0; }
.hub-play {
  margin-left: auto;
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 700;
  border: 1px solid var(--text);
  border-radius: 999px;
  padding: 7px 16px;
}
.hub-soon {
  margin-left: auto;
  flex: 0 0 auto;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--muted);
}

/* ---------- modal ---------- */
.modal-scrim {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal {
  background: var(--bg);
  border-radius: 12px;
  max-width: 440px;
  width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 20px 22px 24px;
}
.modal-head { display: flex; align-items: flex-start; gap: 12px; }
.modal-head h2 {
  font-family: var(--font-display);
  font-size: 20px;
  font-weight: 700;
  margin: 0;
  flex: 1;
}
.modal-close {
  background: none;
  border: 0;
  font-size: 24px;
  line-height: 1;
  color: var(--muted);
  padding: 0 2px;
}
.modal-body { margin-top: 10px; }
.modal-body p { font-size: 14px; line-height: 1.55; color: var(--text); margin: 0 0 12px; }
.modal-body p:last-child { margin-bottom: 0; }

@media (max-width: 480px) {
  .hub-hero { padding: 26px 16px 18px; }
  .hub-hero h1 { font-size: 26px; }
}
```

- [ ] **Step 4: Swap the stylesheet imports and delete the dark theme**

Replace `src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/tokens.css'
import './styles/base.css'
import { Shell } from './platform/Shell'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Shell />
  </StrictMode>,
)
```

```bash
git rm src/index.css
```

- [ ] **Step 5: Verify**

Run: `npm test`
Expected: `Tests 79 passed (79)`

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 6: Look at it in the browser**

Start the dev server via the Browser pane (`preview_start`, not a shell command) and open the hub. Confirm:
- white background, no navy anywhere on the hub
- the Lifespan row shows a green/gray/gray/red tile, name in Georgia, tagline in gray, a pill-outlined `Play`
- clicking `Play` navigates to `#/lifespan` and the game loads
- the back arrow returns to the hub
- the ⓘ opens the modal; Escape closes it

Check `read_console_messages` for errors.

Expect the *game* screen to look broken at this point, and do not treat that as a
regression: Task 5 renamed its wrapper from `.app` to `.lifespan`, so the old
dark stylesheet's wrapper and header rules no longer match, while its map, chip
and mode-toggle rules still do. The game is therefore partly unstyled and still
dark in places until Task 8 restyles it.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: white NYT-style design tokens and platform styling

Replaces the dark navy theme. --muted is darkened from Wordle's #787c7e to
#6e7276 so secondary text clears WCAG AA on white."
```

---

### Task 8: Restyle Lifespan for the white theme

**Files:**
- Modify: `src/games/lifespan/lifespan.css` (full rewrite)
- Modify: `src/games/lifespan/components/MapView.tsx`

**Interfaces:**
- Consumes: tokens from Task 7; the `.lifespan` / `.lifespan-modes` class names from Task 5 Step 7.
- Produces: `MAP_COLORS` exported from `MapView.tsx` — the one sanctioned place for color literals, because Leaflet's JS options cannot read CSS variables.

- [ ] **Step 1: Restyle the map**

In `src/games/lifespan/components/MapView.tsx`, replace the `landStyle` constant:

```tsx
/*
 * Leaflet takes colors as JS options, which cannot read CSS custom
 * properties — so these mirror tokens.css by hand. Keep them in sync with
 * --land, --coast, --born and --died.
 */
export const MAP_COLORS = {
  land: '#dfe3e7',
  coast: '#b9c0c7',
  born: '#6aaa64',
  died: '#c9433f',
} as const

const landStyle = {
  color: MAP_COLORS.coast,
  weight: 1,
  fillColor: MAP_COLORS.land,
  fillOpacity: 1,
}
```

Then update the two `CircleMarker` elements at the bottom of the same file:

```tsx
      <CircleMarker center={[birth.lat, birth.lng]} radius={9}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: MAP_COLORS.born, fillOpacity: 1 }} />
      <CircleMarker center={[death.lat, death.lng]} radius={9}
        pathOptions={{ color: '#ffffff', weight: 2, fillColor: MAP_COLORS.died, fillOpacity: 1 }} />
```

- [ ] **Step 2: Rewrite the game stylesheet**

Replace the whole of `src/games/lifespan/lifespan.css`:

```css
.lifespan { display: flex; flex-direction: column; }

/* Mode toggle: an underlined segmented control, centered under the header. */
.lifespan-modes { display: flex; justify-content: center; padding: 12px 16px 0; }
.mode-toggle { display: flex; gap: 22px; }
.mode-toggle button {
  background: none;
  border: 0;
  padding: 4px 0;
  font-size: 13px;
  font-weight: 600;
  color: var(--muted);
  border-bottom: 2px solid transparent;
}
.mode-toggle button.active { color: var(--text); border-bottom-color: var(--text); }

/* The ocean is white like the page, so hairlines define the map band. */
.map {
  height: 42vh;
  min-height: 260px;
  width: 100%;
  margin-top: 14px;
  border-top: 1px solid var(--rule);
  border-bottom: 1px solid var(--rule);
}
.map.leaflet-container { background: var(--bg); }

.date-legend { display: flex; flex-wrap: wrap; gap: 8px; justify-content: center; padding: 14px 16px 0; }
.date-legend .chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 6px 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  font-size: 12.5px;
  font-weight: 600;
}
.date-legend .chip::before { content: ''; width: 8px; height: 8px; border-radius: 50%; }
.date-legend .chip.born::before { background: var(--born); }
.date-legend .chip.died::before { background: var(--died); }

.controls { padding: 16px; display: flex; flex-direction: column; gap: 14px; }
.puzzle-no {
  margin: 0;
  text-align: center;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--muted);
}

.guess-notice { margin: 0; color: var(--died); font-size: 13px; text-align: center; }

.guess-input input {
  width: 100%;
  padding: 13px 14px;
  border: 2px solid var(--text);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-family: inherit;
  font-size: 16px;
}
.guess-input input::placeholder { color: var(--muted); }

.hint-panel { border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; }
.hints, .guess-history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 7px; }
.hints li { font-size: 13.5px; }
.hint-label { color: var(--muted); }
.hint-empty { color: var(--muted); margin: 0; font-size: 13px; }

.guess-history li {
  background: var(--surface);
  border-radius: 6px;
  padding: 10px 12px;
  font-size: 13.5px;
  font-weight: 600;
}

.result-screen {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 24px 20px;
  text-align: center;
}
.result-screen h2 {
  font-family: var(--font-display);
  font-size: 24px;
  font-weight: 700;
  margin: 0 0 10px;
}
.result-screen .answer { font-family: var(--font-display); font-size: 18px; margin: 0 0 8px; }
.result-screen .bio { color: var(--muted); font-size: 13.5px; line-height: 1.55; }
.share-preview {
  background: var(--surface);
  border-radius: var(--radius);
  padding: 13px;
  white-space: pre-wrap;
  font-family: inherit;
  font-size: 13px;
  text-align: left;
}
.result-actions { display: flex; gap: 10px; justify-content: center; }
.result-actions button {
  padding: 11px 20px;
  border-radius: 999px;
  border: 1px solid var(--text);
  background: var(--bg);
  color: var(--text);
  font-size: 13px;
  font-weight: 700;
}
.result-actions button:first-child { background: var(--text); color: var(--bg); }

@media (max-width: 480px) {
  .map { height: 36vh; }
}
```

- [ ] **Step 3: Verify**

Run: `npm test`
Expected: `Tests 79 passed (79)`

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 4: Look at the game in the browser and tune the map**

Open `#/lifespan` in the Browser pane. Confirm no navy remains, then judge the one thing that is gameplay rather than decoration:

**Is the land clearly distinguishable from the ocean at the zoom the game uses?** Country shapes are how the player solves the puzzle. If `--land: #dfe3e7` reads too faint, darken it (try `#d8dde2`, then `#d0d6dc`) and darken `--coast` to match. Change the value in **both** `src/styles/tokens.css` and `MAP_COLORS` in `MapView.tsx`.

Take a screenshot and send it to the user before committing — this value is theirs to approve.

Also confirm: mode toggle switches and re-fits the map; the born/died chips show correct dot colors; a wrong guess renders a hint row; the result screen reads correctly at the end of a round.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: restyle Lifespan for the white theme

White ocean with light-gray land, Wordle green/red pins, outlined date
chips, underlined mode toggle. MAP_COLORS mirrors the CSS tokens because
Leaflet takes colors as JS options."
```

---

### Task 9: Guess progress dots

Replaces the sentence "N of 6 guesses left" with six dots, keeping the information available to screen readers.

**Files:**
- Create: `src/games/lifespan/components/GuessDots.tsx`
- Test: `src/games/lifespan/components/GuessDots.test.tsx`
- Modify: `src/games/lifespan/components/HintPanel.tsx`
- Modify: `src/games/lifespan/Lifespan.tsx`
- Modify: `src/games/lifespan/lifespan.css`

**Interfaces:**
- Consumes: `MAX_GUESSES` from `../game/constants`; `wrongCount` / state from `../game/useGame`.
- Produces: `GuessDots({ used, max })`.

- [ ] **Step 1: Write the failing test**

Create `src/games/lifespan/components/GuessDots.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GuessDots } from './GuessDots'

describe('GuessDots', () => {
  it('describes progress for assistive tech', () => {
    render(<GuessDots used={2} max={6} />)
    expect(screen.getByRole('img', { name: '2 of 6 guesses used' })).toBeInTheDocument()
  })

  it('renders one dot per allowed guess', () => {
    render(<GuessDots used={2} max={6} />)
    expect(screen.getByRole('img').children).toHaveLength(6)
  })

  it('marks exactly the used dots', () => {
    render(<GuessDots used={2} max={6} />)
    expect(screen.getByRole('img').querySelectorAll('.used')).toHaveLength(2)
  })

  it('handles a fresh round', () => {
    render(<GuessDots used={0} max={6} />)
    expect(screen.getByRole('img', { name: '0 of 6 guesses used' })).toBeInTheDocument()
    expect(screen.getByRole('img').querySelectorAll('.used')).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/games/lifespan/components/GuessDots.test.tsx`
Expected: FAIL — `Failed to resolve import "./GuessDots"`

- [ ] **Step 3: Write GuessDots**

Create `src/games/lifespan/components/GuessDots.tsx`:

```tsx
interface Props {
  used: number
  max: number
}

/*
 * The dots replace the sentence "N of 6 guesses left", so they must carry
 * that information for screen readers themselves — hence role="img" with an
 * explicit label rather than six undescribed decorations.
 */
export function GuessDots({ used, max }: Props) {
  return (
    <div className="guess-dots" role="img" aria-label={`${used} of ${max} guesses used`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < used ? 'used' : ''} />
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/games/lifespan/components/GuessDots.test.tsx`
Expected: PASS, 4 tests

- [ ] **Step 5: Drop the guesses-left line from HintPanel**

Replace the whole of `src/games/lifespan/components/HintPanel.tsx`. The guess count now lives in `GuessDots`, so the `guessesLeft` prop and the `MAX_GUESSES` import both go away — leaving either behind fails the build under `noUnusedLocals`.

```tsx
import type { RevealedHint } from '../game/hints'

interface Props {
  hints: RevealedHint[]
}

export function HintPanel({ hints }: Props) {
  return (
    <div className="hint-panel">
      <div className="label">Hints unlocked</div>
      {hints.length === 0 ? (
        <p className="hint-empty">
          No hints yet — guess from the map, or a wrong guess unlocks a clue.
        </p>
      ) : (
        <ul className="hints">
          {hints.map((h) => (
            <li key={h.label}><span className="hint-label">{h.label}:</span> {h.value}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
```

- [ ] **Step 6: Render the dots in the game**

In `src/games/lifespan/Lifespan.tsx`, add the import beside the other component imports:

```tsx
import { GuessDots } from './components/GuessDots'
```

Then replace this block:

```tsx
            <GuessInput disabled={false} onGuess={handleGuess} />
            {notice && <p className="guess-notice">{notice}</p>}
            <HintPanel
              hints={revealedHints(person, wrongCount(state))}
              guessesLeft={MAX_GUESSES - state.guesses.length}
            />
```

with:

```tsx
            <GuessDots used={state.guesses.length} max={MAX_GUESSES} />
            <GuessInput disabled={false} onGuess={handleGuess} />
            {notice && <p className="guess-notice">{notice}</p>}
            <HintPanel hints={revealedHints(person, wrongCount(state))} />
```

`MAX_GUESSES` is already imported in this file and is still used here and by `buildShareText`, so its import stays.

- [ ] **Step 7: Style the dots**

Append to `src/games/lifespan/lifespan.css`:

```css
.guess-dots { display: flex; gap: 6px; justify-content: center; }
.guess-dots i {
  display: block;
  width: 28px;
  height: 5px;
  border-radius: 3px;
  background: var(--border);
}
.guess-dots i.used { background: var(--died); }
```

Also add a top margin to the hints label inside the panel, appended to the same file:

```css
.hint-panel .label { margin-bottom: 9px; }
```

- [ ] **Step 8: Verify**

Run: `npm test`
Expected: `Tests 83 passed (83)`

Run: `npm run build`
Expected: `✓ built` — no `noUnusedLocals` error

- [ ] **Step 9: Check it in the browser**

Play a round at `#/lifespan`: dots should fill red as guesses are spent, and the hints panel should show its uppercase header with hints appearing after wrong guesses.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: guess progress dots with an accessible label

Replaces the 'N of 6 guesses left' sentence. role=img plus aria-label keeps
the count available to screen readers."
```

---

### Task 10: Favicon, page title, and documentation

**Files:**
- Create: `public/favicon.svg`
- Modify: `index.html`
- Modify: `README.md`
- Delete: `public/vite.svg`, `src/assets/react.svg`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing. Final cleanup.

- [ ] **Step 1: Create the favicon**

Create `public/favicon.svg` — the same 2×2 tile the hub uses for Lifespan:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#ffffff"/>
  <rect x="2"  y="2"  width="13" height="13" fill="#6aaa64"/>
  <rect x="17" y="2"  width="13" height="13" fill="#d3d6da"/>
  <rect x="2"  y="17" width="13" height="13" fill="#d3d6da"/>
  <rect x="17" y="17" width="13" height="13" fill="#c9433f"/>
</svg>
```

- [ ] **Step 2: Update index.html**

Replace the `<link rel="icon">` and `<title>` lines in `index.html`:

```html
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <meta name="description" content="Daily puzzle games from MetroWreckLabs." />
    <title>MetroWreckLabs — daily puzzles</title>
```

Vite rewrites the leading `/` against `base` at build time, so this resolves correctly under `/MetroWreckLabs/` on GitHub Pages.

- [ ] **Step 3: Delete the leftover Vite scaffolding**

```bash
git rm public/vite.svg src/assets/react.svg
```

- [ ] **Step 4: Verify nothing referenced them**

Run: `grep -rn "vite.svg\|react.svg" src index.html`
Expected: no output.

Run: `npm run build`
Expected: `✓ built`

- [ ] **Step 5: Update the README**

In `README.md`, replace the opening paragraph:

```markdown
# MetroWreckLabs

A platform for daily puzzle games. The hub lists the games; each game lives in
its own module and is code-split so opening the hub doesn't download all of them.

## Games

- **Lifespan** (`#/lifespan`) — a green pin marks where someone was born and a
  red pin where they died. Deduce who they are in 6 guesses; each wrong guess
  unlocks a hint (gender & nationality → profession → initials).
```

Then replace the `## Modes` heading with `## Lifespan modes`, and add this section immediately before `## Design docs`:

```markdown
## Adding a game

1. Create `src/games/<id>/` with a default-exported React component.
2. Add one entry to `GAMES` in `src/platform/games.tsx` — `id`, `name`,
   `tagline`, `tiles`, `howToPlay`, `status: 'live'`, and
   `load: () => import('../games/<id>/<Component>')`.

That's the whole integration. The hub row, the `#/<id>` route, the header, and
the how-to-play modal all come from that entry. Use `status: 'soon'` (and no
`load`) to list a game before it's playable.

## Structure

- `src/platform/` — shell, hash router, hub, game registry, how-to-play modal
- `src/games/<id>/` — one self-contained game, lazy-loaded
- `src/styles/` — design tokens and base styles
```

Finally, append the new spec and plan to the `## Design docs` list:

```markdown
- Platform spec: `docs/superpowers/specs/2026-09-22-platform-shell-design.md`
- Platform plan: `docs/superpowers/plans/2026-09-22-platform-shell.md`
```

- [ ] **Step 6: Final verification**

Run: `npm test`
Expected: `Tests 83 passed (83)`

Run: `npm run build`
Expected: `✓ built`, with a small entry chunk and a separate large `Lifespan-*.js`

In the Browser pane: load the hub, confirm the favicon and tab title, click into Lifespan, play a full round, use the back arrow, open the ⓘ on both screens.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: favicon, page title, and README for the platform

Documents the two-step process for adding a game and removes the leftover
Vite scaffolding assets."
```

---

## Verification summary

| Task | Tests after | Other gate |
|---|---|---|
| 1 Move | 46 | bundle unchanged; pure refactor |
| 2 Router | 52 | — |
| 3 Registry | 61 | — |
| 4 Hub | 66 | — |
| 5 Shell | 72 | **build emits 2+ chunks; entry ~40–60 kB** |
| 6 Modal | 79 | — |
| 7 Tokens | 79 | browser: hub is white, navigation works |
| 8 Lifespan restyle | 79 | browser: land/ocean contrast approved by user |
| 9 Guess dots | 83 | browser: dots fill as guesses are spent |
| 10 Polish | 83 | browser: full round, favicon, title |

**The acceptance test for the whole plan:** adding game 2 touches exactly one new folder under `src/games/` and one entry in `src/platform/games.tsx`. If anything else needs editing, the boundary leaked and it's worth fixing before game 2 is built on top of it.

# Platform Shell & Visual Redesign — Design Spec

**Date:** 2026-09-22
**Status:** Approved
**Supersedes nothing.** Extends `2026-06-21-metrowrecklabs-design.md`, which specified the
single game. That spec's gameplay rules still hold; this one turns the app around it into a
platform.

## Goal

MetroWreckLabs becomes a games platform rather than a single game:

1. A **hub** lists the available games; players pick one from a menu.
2. The born/died map game is named **Lifespan** and becomes one game module among several.
3. The visual design moves from dark navy to a **white, NYT-Games-style** treatment.
4. The structure makes **adding game 2 an afternoon**, not a refactor.

Item 4 is the real goal. Game 2 is the next piece of work, so the boundary between "platform"
and "game" is the thing this milestone has to get right.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Navigation | Hash routes, hand-rolled (~30 lines) | Deep-linkable and shareable; works on GitHub Pages with no server config; no dependency |
| Game 1 name | **Lifespan** | Single word, NYT-style restraint (Wordle, Connections, Strands); platform keeps the MetroWreckLabs name |
| Visual direction | **NYT Games** | Serif wordmark, hairline rules, tile icons, generous white space; scales to many games without looking busy |
| Game layout | **Stream** | Progress dots, a distinct hints panel, guesses stacking below — closer to the existing structure, restyled |
| Persistence | **None this milestone** | Hub is a stateless launcher; localStorage lands later, once two games exist to share the shape |
| Code structure | **Game registry + shell, lazy-loaded** | One registry entry per game; `React.lazy` keeps the hub small |
| How-to-play | **In scope** — shell-owned modal, per-game content | The ⓘ in the design has to do something; game 2 inherits it free |
| Dark mode | Out of scope | White was the explicit ask; tokens make it a later single-block addition |

### Why lazy loading is not optional

The current bundle is **1.3 MB**, of which ~1.2 MB is `countries.json` (819 KB) and
`people.json` (375 KB) — data only Lifespan needs. Loaded eagerly, the hub would pay Lifespan's
full cost before the player has chosen anything, and the cost would grow with every game added.
Vite code-splits on the dynamic `import()` in each registry entry, so the hub ships ~40 KB and a
game's payload arrives when it is opened.

## Structure

Every import inside the game is already relative (`./components/MapView`, `../game/useGame`,
`../data/countries.json`). Moving the directories *together* leaves all of those paths valid, so
the move needs **zero import rewrites** inside the game.

```
src/
  main.tsx                  renders <Shell />
  styles/
    tokens.css              white-theme custom properties
    base.css                reset, body, typography
  platform/
    Shell.tsx               header + routed content + <Suspense> + modal host
    Hub.tsx                 the menu
    GameTile.tsx            2x2 tile icon, colors from the registry
    HowToPlay.tsx           modal
    games.tsx               THE REGISTRY
    router.ts               useHashRoute()
  games/
    lifespan/
      Lifespan.tsx          was App.tsx, minus <h1> and the .app wrapper
      lifespan.css          was App.css, rewritten
      components/           moved verbatim (6 files + 2 tests)
      game/                 moved verbatim (7 files + 6 tests)
      data/                 moved verbatim
```

The only files whose *contents* change during the move are `App.tsx` → `Lifespan.tsx` (drops the
`<h1>` and outer wrapper, now owned by Shell) and `main.tsx`.

### Ownership boundaries

- **Shell** owns page chrome: wordmark (links to `#/`), back arrow and game name when inside a
  game, the max-width column, the modal host.
- **A game** owns everything below the header — including its own Daily/Endless toggle, since
  modes are a per-game concept and game 2 may not have them.
- **Registry** is the only file that knows the set of games. Hub and router both read from it;
  neither hardcodes a game.

**Acceptance test for the boundary:** adding game 2 touches exactly two things — a new folder
under `games/`, and one entry in `games.tsx`.

### The registry

A discriminated union, so "a coming-soon game has no component" is guaranteed by the type
checker rather than by a runtime guard:

```ts
interface Base {
  id: string        // URL segment: #/lifespan
  name: string
  tagline: string
  tiles: [string, string, string, string]   // 2x2 icon; token names, resolved to var(--<name>)
  howToPlay: ReactNode
}

export type GameMeta =
  | (Base & { status: 'live'; load: () => Promise<{ default: ComponentType }> })
  | (Base & { status: 'soon' })

export const GAMES: GameMeta[] = [
  {
    id: 'lifespan',
    name: 'Lifespan',
    tagline: 'Two pins, two dates. Who were they?',
    tiles: ['born', 'border', 'border', 'died'],
    status: 'live',
    load: () => import('../games/lifespan/Lifespan'),
    howToPlay: <><p>A green pin marks where they were born, a red pin where they died.</p>
                <p>Six guesses. Each wrong one unlocks a hint.</p></>,
  },
]
```

### Routing

`useHashRoute()` reads `location.hash` via `useSyncExternalStore` subscribed to `hashchange` —
no effect/state pair to keep in sync, no tearing. It returns the bare id (`#/lifespan` →
`'lifespan'`).

Resolution, all in one place in `Shell.tsx`:

- `''`, `'#/'`, or any unrecognized id → **hub**
- an id whose `status` is `'soon'` → **hub**
- a `'live'` id → `<Suspense fallback={…}><LazyGame /></Suspense>`

Unknown and not-yet-built ids fall back to the hub rather than a 404, so a stale shared link
degrades gracefully — game 2's URL may get shared before game 2 exists.

## Design system

### Tokens (`src/styles/tokens.css`)

```css
:root {
  --bg: #ffffff;        --surface: #f6f7f8;
  --border: #d3d6da;    --rule: #eceef0;
  --text: #111111;      --muted: #6e7276;      --disabled: #a0a4a8;
  --born: #6aaa64;      --died: #c9433f;
  --land: #dfe3e7;      --coast: #b9c0c7;
  --font-display: Georgia, 'Times New Roman', serif;
  --font-ui: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  --col: 600px;         --radius: 8px;
}
```

### Typography

Georgia for the wordmark, game names, and result headlines; `system-ui` for everything else.
Zero network requests, identical rendering offline, present on every target platform. NYT's real
pairing is Karnak + Franklin; the free lookalikes (Zilla Slab + Libre Franklin) are a one-line
swap later if more distinctiveness is wanted.

### Contrast: a deliberate deviation from Wordle

Wordle's muted gray `#787c7e` is 4.27:1 on white and **fails WCAG AA** for body text; a lighter
gray for small uppercase labels would be ~2.7:1 and fail badly. Therefore: **two ink levels, not
three.**

- `--text` `#111111` — primary.
- `--muted` `#6e7276` (4.8:1, passes AA) — **all** secondary text, uppercase labels included.
- `--disabled` `#a0a4a8` — reserved for genuinely non-informative marks (the `—` in an empty
  row, dividers). Never for text carrying meaning.

Hierarchy comes from size, weight, and letter-spacing rather than from lightness. The result is
visually near-identical to the approved mockup and legible for real people.

Knock-on effect: the hub's "coming soon" rows must **not** take a blanket `opacity: .45`, which
would drop their text below AA. The *tile* dims; the text stays at `--muted`.

### Map

The current `#0a2a43` ocean with `#cbd5e1` land inverts for the white theme:

| Property | From | To |
|---|---|---|
| Container background | `#0a2a43` | `#ffffff` |
| Land fill | `#cbd5e1` | `var(--land)` `#dfe3e7` |
| Land stroke | `#0a2a43` | `var(--coast)` `#b9c0c7` |
| Birth pin | `#34d399` | `var(--born)` `#6aaa64` |
| Death pin | `#f87171` | `var(--died)` `#c9433f` |

A white ocean on a white page has no edges, so the map takes hairline rules above and below to
read as a defined band.

**Named risk:** the game rests on recognizing country *shapes*, so land-vs-ocean contrast is
gameplay, not decoration. `#dfe3e7` is a starting value to be tuned against the running app and
confirmed by screenshot — not trusted from a mockup.

### Screens

**Hub** — wordmark + ⓘ; "Daily puzzles" hero in Georgia with today's date; hairline-separated
rows of `tile · name · tagline · Play pill | SOON`. Live rows are links; soon rows are inert, not
focusable no-op buttons. No hamburger — there is no menu behind it.

**Game (Lifespan)** — `←` back, centered "Lifespan", ⓘ; Daily/Endless as a centered segmented
control; map band; `DAILY NO. 94` uppercase label; born/died as outlined pills with a colored dot
(replacing today's translucent fills); six progress dots; 2px-black-bordered input with a black
pill `Guess` button; bordered hints panel with an uppercase header; light-gray guess rows.

**Result** — the emoji headlines (`🎉 Solved!`, `💀 Out of guesses`) become Georgia type; share
text in a `--surface` block; black pill `Share` beside an outlined `Play again`.

The six progress dots replace the sentence "N of 6 guesses left", so the dot container takes
`role="img"` with an `aria-label` (e.g. "2 of 6 guesses used") — otherwise that information
disappears for screen-reader users.

## Testing

The 49 existing tests are the safety net for the move. They assert behavior through roles and
text, never classNames, so they survive the restyle; if they stay green after `git mv`, the
refactor is proven. Baseline is captured before anything moves.

New tests, written first:

- **`router.test.ts`** — `#/lifespan` → `'lifespan'`; `''` and `#/` → `''`; a `hashchange`
  re-renders.
- **`games.test.ts`** — registry invariants: ids unique, ids are URL-safe slugs, every `live`
  entry has a `load`, `tiles` has exactly 4 entries. This is what stops game 2 from being added
  wrong later.
- **`Hub.test.tsx`** — one row per registry entry; `live` rows link to `#/<id>`; `soon` rows
  render no link.
- **`Shell.test.tsx`** — `#/` renders the hub; an unknown hash falls back to the hub; a live hash
  renders the game.

**Design consequence:** `Shell` and `Hub` accept `games` as a prop defaulting to `GAMES`, so
tests inject a fixture. This is the seam that keeps Leaflet and 1.2 MB of JSON out of jsdom,
where Leaflet is genuinely painful. `MapView` has no test today and gains none — wrong
cost/benefit in jsdom.

## Migration order

Structural change first, proven by the existing tests, *then* pixels — so a visual regression can
never be confused with a broken move. Each step ends green.

0. **Housekeeping.** Commit the pending changes to `scripts/enrich-aliases.mjs` and
   `src/data/people.json` as their own change; a large `git mv` mixed with data edits is very
   hard to review. Capture the baseline: `npm test` (49 passing), `npm run build`, note bundle
   size.
1. **Move.** `git mv` the three directories; `App.tsx` → `Lifespan.tsx`; `main.tsx` renders it
   directly. App looks identical, 49 tests green, build works. Pure refactor.
2. **Registry + router + Shell**, TDD. Hub exists but plain. Navigation works.
3. **Tokens + white theme.** `tokens.css`, `base.css`, rewrite `lifespan.css`, restyle the map.
   Verify in the browser, tune land contrast, screenshot.
4. **Hub polish + how-to-play modal.** `GameTile`, NYT rows.
5. **Detail pass.** Chips, progress dots, result screen, an SVG favicon, and a real `<title>` —
   `vite.svg` is still in the tab.
6. **README.** New structure, Lifespan as a game name, delete the dead `App.css`.

Every step runs `npm test` and `npm run build`; steps 3–5 add browser verification with
screenshots.

## Out of scope

- localStorage, stats, streaks, share-back-to-hub
- Dark mode
- Game 2 itself (designed next, in its own spec)
- Web fonts
- Any change to Lifespan's gameplay rules, dataset, or hint ladder

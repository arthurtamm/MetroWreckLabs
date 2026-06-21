# MetroWreckLabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static, front-end-only daily "guess the mystery person from their birth/death map pins" game with a daily and an endless mode.

**Architecture:** Pure game logic (daily selection, guess matching, hint progression, share text) lives in small, unit-tested modules under `src/game/`. A `useGame` reducer holds round state. Presentational React components render the map (react-leaflet), guess input, hints, history, and result. A one-time Node script harvests the curated people list from Wikidata into `src/data/people.json`. Everything builds to static files via Vite.

**Tech Stack:** React + TypeScript + Vite, react-leaflet/Leaflet (OpenStreetMap tiles), Vitest + @testing-library/react (jsdom) for tests.

**Reference spec:** `docs/superpowers/specs/2026-06-21-metrowrecklabs-design.md`

---

## File Structure

```
scripts/harvest-wikidata.mjs     One-time Wikidata SPARQL harvest → people.json
src/data/types.ts                Person type + dataset typing
src/data/people.json             Curated dataset (starter seed now; full ~150 via harvest)
src/game/constants.ts            EPOCH, MAX_GUESSES, HINT_ORDER
src/game/selectDaily.ts          Deterministic daily index from a date
src/game/match.ts                normalizeName, isCorrectGuess
src/game/hints.ts                deriveInitials, revealedHints
src/game/share.ts                buildShareText
src/game/useGame.ts              Reducer + hook for round state
src/components/MapView.tsx       Leaflet map with green/red pins + date labels
src/components/GuessInput.tsx    Autocomplete name entry
src/components/HintPanel.tsx     Revealed hints list
src/components/GuessHistory.tsx  Past wrong guesses
src/components/ResultScreen.tsx  Win/lose + bio + share button
src/components/ModeToggle.tsx    Daily / Endless switch
src/App.tsx                      Wires everything together (Layout B)
src/App.css / src/index.css      Layout + theme
```

---

## Task 1: Scaffold the Vite + React + TypeScript project

**Files:**
- Create: project scaffold (package.json, vite.config.ts, tsconfig, index.html, src/main.tsx, src/App.tsx)

- [ ] **Step 1: Scaffold with Vite's react-ts template**

Run from the project root (it already contains `.git`, `.gitignore`, and `docs/`):

```bash
npm create vite@latest . -- --template react-ts
```

If prompted that the directory is not empty, choose **"Ignore files and continue"**. This keeps `docs/`, `.git`, and `.gitignore`.

- [ ] **Step 2: Install dependencies**

```bash
npm install
npm install leaflet react-leaflet
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @types/leaflet
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the file with:

```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})
```

- [ ] **Step 4: Create the test setup file**

Create `src/test/setup.ts`:

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Add a test script to `package.json`**

In the `"scripts"` block, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 6: Verify the toolchain runs**

Run: `npm run build`
Expected: builds with no errors, produces `dist/`.

Run: `npm run test`
Expected: "No test files found" (exit 0) — Vitest is wired up but we have no tests yet.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project with Vitest"
```

---

## Task 2: Define the Person data type and a starter dataset

**Files:**
- Create: `src/data/types.ts`
- Create: `src/data/people.json`

- [ ] **Step 1: Define the type**

Create `src/data/types.ts`:

```ts
export interface GeoPoint {
  date: string   // ISO YYYY-MM-DD
  place: string  // human-readable, e.g. "Salzburg, Austria"
  lat: number
  lng: number
}

export interface PersonHints {
  century: string      // e.g. "18th century"
  gender: string       // e.g. "Male"
  nationality: string  // e.g. "Austrian"
  profession: string   // e.g. "Composer"
}

export interface Person {
  id: string
  name: string
  birth: GeoPoint
  death: GeoPoint
  hints: PersonHints
  bio: string
  acceptedAnswers: string[]  // lowercase accepted strings
}
```

- [ ] **Step 2: Create a hand-verified starter dataset**

Create `src/data/people.json` with these verified entries (the full ~150 list is generated in Task 9; this seed lets us build and test now):

```json
[
  {
    "id": "mozart",
    "name": "Wolfgang Amadeus Mozart",
    "birth": { "date": "1756-01-27", "place": "Salzburg, Austria", "lat": 47.8, "lng": 13.04 },
    "death": { "date": "1791-12-05", "place": "Vienna, Austria", "lat": 48.21, "lng": 16.37 },
    "hints": { "century": "18th century", "gender": "Male", "nationality": "Austrian", "profession": "Composer" },
    "bio": "A prolific and influential composer of the Classical period.",
    "acceptedAnswers": ["mozart", "wolfgang amadeus mozart"]
  },
  {
    "id": "napoleon",
    "name": "Napoleon Bonaparte",
    "birth": { "date": "1769-08-15", "place": "Ajaccio, Corsica, France", "lat": 41.93, "lng": 8.74 },
    "death": { "date": "1821-05-05", "place": "Longwood, Saint Helena", "lat": -15.95, "lng": -5.7 },
    "hints": { "century": "18th-19th century", "gender": "Male", "nationality": "French", "profession": "Military leader & emperor" },
    "bio": "A French military and political leader who became Emperor of the French.",
    "acceptedAnswers": ["napoleon", "napoleon bonaparte", "napoleon i"]
  },
  {
    "id": "curie",
    "name": "Marie Curie",
    "birth": { "date": "1867-11-07", "place": "Warsaw, Poland", "lat": 52.23, "lng": 21.01 },
    "death": { "date": "1934-07-04", "place": "Passy, Haute-Savoie, France", "lat": 45.92, "lng": 6.73 },
    "hints": { "century": "19th-20th century", "gender": "Female", "nationality": "Polish-French", "profession": "Physicist & chemist" },
    "bio": "A physicist and chemist who conducted pioneering research on radioactivity.",
    "acceptedAnswers": ["marie curie", "curie", "maria sklodowska", "marie sklodowska curie"]
  },
  {
    "id": "lincoln",
    "name": "Abraham Lincoln",
    "birth": { "date": "1809-02-12", "place": "Hodgenville, Kentucky, USA", "lat": 37.57, "lng": -85.74 },
    "death": { "date": "1865-04-15", "place": "Washington, D.C., USA", "lat": 38.9, "lng": -77.04 },
    "hints": { "century": "19th century", "gender": "Male", "nationality": "American", "profession": "Politician & president" },
    "bio": "The 16th President of the United States, who led the nation through the Civil War.",
    "acceptedAnswers": ["abraham lincoln", "lincoln"]
  },
  {
    "id": "gandhi",
    "name": "Mahatma Gandhi",
    "birth": { "date": "1869-10-02", "place": "Porbandar, Gujarat, India", "lat": 21.64, "lng": 69.6 },
    "death": { "date": "1948-01-30", "place": "New Delhi, India", "lat": 28.61, "lng": 77.21 },
    "hints": { "century": "19th-20th century", "gender": "Male", "nationality": "Indian", "profession": "Independence leader" },
    "bio": "Leader of the Indian independence movement against British rule.",
    "acceptedAnswers": ["mahatma gandhi", "gandhi", "mohandas gandhi", "mohandas karamchand gandhi"]
  },
  {
    "id": "frida",
    "name": "Frida Kahlo",
    "birth": { "date": "1907-07-06", "place": "Coyoacán, Mexico City, Mexico", "lat": 19.35, "lng": -99.16 },
    "death": { "date": "1954-07-13", "place": "Coyoacán, Mexico City, Mexico", "lat": 19.35, "lng": -99.16 },
    "hints": { "century": "20th century", "gender": "Female", "nationality": "Mexican", "profession": "Painter" },
    "bio": "A Mexican painter known for her many portraits, self-portraits, and works inspired by nature.",
    "acceptedAnswers": ["frida kahlo", "kahlo", "frida"]
  },
  {
    "id": "beethoven",
    "name": "Ludwig van Beethoven",
    "birth": { "date": "1770-12-17", "place": "Bonn, Germany", "lat": 50.73, "lng": 7.1 },
    "death": { "date": "1827-03-26", "place": "Vienna, Austria", "lat": 48.21, "lng": 16.37 },
    "hints": { "century": "18th-19th century", "gender": "Male", "nationality": "German", "profession": "Composer" },
    "bio": "A German composer and pianist who is a crucial figure in Western classical music.",
    "acceptedAnswers": ["beethoven", "ludwig van beethoven"]
  },
  {
    "id": "cleopatra",
    "name": "Cleopatra",
    "birth": { "date": "0069-01-01", "place": "Alexandria, Egypt", "lat": 31.2, "lng": 29.92 },
    "death": { "date": "0030-08-12", "place": "Alexandria, Egypt", "lat": 31.2, "lng": 29.92 },
    "hints": { "century": "1st century BC", "gender": "Female", "nationality": "Egyptian (Ptolemaic)", "profession": "Pharaoh" },
    "bio": "The last active ruler of the Ptolemaic Kingdom of Egypt.",
    "acceptedAnswers": ["cleopatra", "cleopatra vii"]
  }
]
```

> Note: dates are stored as ISO strings; BC/ancient dates are kept simple in the `century` hint. The harvest script (Task 9) appends modern, well-coordinated entries to reach ~150.

- [ ] **Step 3: Commit**

```bash
git add src/data/types.ts src/data/people.json
git commit -m "feat: add Person type and starter dataset"
```

---

## Task 3: Game constants

**Files:**
- Create: `src/game/constants.ts`

- [ ] **Step 1: Create constants**

Create `src/game/constants.ts`:

```ts
import type { PersonHints } from '../data/types'

/** Launch date — daily puzzle #1. Local-date based. */
export const EPOCH = '2026-06-21'

export const MAX_GUESSES = 6

/** Order hints are revealed after each wrong guess: least → most helpful. */
export const HINT_ORDER: (keyof PersonHints | 'initials')[] = [
  'century',
  'gender',
  'nationality',
  'profession',
  'initials',
]
```

- [ ] **Step 2: Commit**

```bash
git add src/game/constants.ts
git commit -m "feat: add game constants"
```

---

## Task 4: Daily selection logic (TDD)

**Files:**
- Create: `src/game/selectDaily.ts`
- Test: `src/game/selectDaily.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/selectDaily.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { dailyIndex } from './selectDaily'

describe('dailyIndex', () => {
  it('returns 0 on the epoch date', () => {
    expect(dailyIndex('2026-06-21', '2026-06-21', 8)).toBe(0)
  })

  it('advances by one each day', () => {
    expect(dailyIndex('2026-06-22', '2026-06-21', 8)).toBe(1)
    expect(dailyIndex('2026-06-29', '2026-06-21', 8)).toBe(0) // wraps mod 8
  })

  it('handles month boundaries', () => {
    expect(dailyIndex('2026-07-01', '2026-06-21', 8)).toBe(10 % 8)
  })

  it('never returns negative for dates before epoch', () => {
    const i = dailyIndex('2026-06-20', '2026-06-21', 8)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(8)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- selectDaily`
Expected: FAIL — `dailyIndex` not exported / module missing.

- [ ] **Step 3: Implement**

Create `src/game/selectDaily.ts`:

```ts
/** Whole days between two ISO YYYY-MM-DD dates (UTC midnight, no DST drift). */
function daysBetween(isoA: string, isoB: string): number {
  const a = Date.UTC(
    +isoA.slice(0, 4), +isoA.slice(5, 7) - 1, +isoA.slice(8, 10),
  )
  const b = Date.UTC(
    +isoB.slice(0, 4), +isoB.slice(5, 7) - 1, +isoB.slice(8, 10),
  )
  return Math.round((a - b) / 86_400_000)
}

/** Deterministic index into the people list for a given calendar day. */
export function dailyIndex(today: string, epoch: string, count: number): number {
  const diff = daysBetween(today, epoch)
  return ((diff % count) + count) % count
}

/** Today's date as local ISO YYYY-MM-DD. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Puzzle number shown to players (1-based). */
export function dailyNumber(today: string, epoch: string): number {
  return daysBetween(today, epoch) + 1
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- selectDaily`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/selectDaily.ts src/game/selectDaily.test.ts
git commit -m "feat: add deterministic daily selection"
```

---

## Task 5: Guess matching logic (TDD)

**Files:**
- Create: `src/game/match.ts`
- Test: `src/game/match.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/match.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeName, isCorrectGuess } from './match'
import type { Person } from '../data/types'

const mozart = {
  id: 'mozart',
  acceptedAnswers: ['mozart', 'wolfgang amadeus mozart'],
} as Person

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  Mozart ')).toBe('mozart')
  })
  it('strips diacritics', () => {
    expect(normalizeName('Frida Kahlo Coyoacán')).toBe('frida kahlo coyoacan')
  })
  it('collapses internal whitespace', () => {
    expect(normalizeName('wolfgang   amadeus  mozart')).toBe('wolfgang amadeus mozart')
  })
})

describe('isCorrectGuess', () => {
  it('matches an accepted answer case-insensitively', () => {
    expect(isCorrectGuess('  MOZART ', mozart)).toBe(true)
    expect(isCorrectGuess('Wolfgang Amadeus Mozart', mozart)).toBe(true)
  })
  it('rejects a wrong name', () => {
    expect(isCorrectGuess('Beethoven', mozart)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- match`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/game/match.ts`:

```ts
import type { Person } from '../data/types'

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function isCorrectGuess(guess: string, person: Person): boolean {
  const g = normalizeName(guess)
  return person.acceptedAnswers.some((a) => normalizeName(a) === g)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- match`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/match.ts src/game/match.test.ts
git commit -m "feat: add guess normalization and matching"
```

---

## Task 6: Hint progression logic (TDD)

**Files:**
- Create: `src/game/hints.ts`
- Test: `src/game/hints.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/hints.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { deriveInitials, revealedHints } from './hints'
import type { Person } from '../data/types'

const mozart = {
  name: 'Wolfgang Amadeus Mozart',
  hints: { century: '18th century', gender: 'Male', nationality: 'Austrian', profession: 'Composer' },
} as Person

describe('deriveInitials', () => {
  it('takes first letter of each word, uppercase, dotted', () => {
    expect(deriveInitials('Wolfgang Amadeus Mozart')).toBe('W. A. M.')
  })
})

describe('revealedHints', () => {
  it('reveals nothing with zero wrong guesses', () => {
    expect(revealedHints(mozart, 0)).toEqual([])
  })
  it('reveals century after 1 wrong guess', () => {
    expect(revealedHints(mozart, 1)).toEqual([{ label: 'Century', value: '18th century' }])
  })
  it('reveals in order, accumulating', () => {
    expect(revealedHints(mozart, 3)).toEqual([
      { label: 'Century', value: '18th century' },
      { label: 'Gender', value: 'Male' },
      { label: 'Nationality', value: 'Austrian' },
    ])
  })
  it('reveals initials as the 5th hint', () => {
    const all = revealedHints(mozart, 5)
    expect(all[4]).toEqual({ label: 'Initials', value: 'W. A. M.' })
  })
  it('caps at the number of available hints', () => {
    expect(revealedHints(mozart, 99).length).toBe(5)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- hints`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/game/hints.ts`:

```ts
import type { Person } from '../data/types'
import { HINT_ORDER } from './constants'

export interface RevealedHint {
  label: string
  value: string
}

export function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + '.')
    .join(' ')
}

const LABELS: Record<string, string> = {
  century: 'Century',
  gender: 'Gender',
  nationality: 'Nationality',
  profession: 'Profession',
  initials: 'Initials',
}

/** All hints unlocked given a number of wrong guesses, in reveal order. */
export function revealedHints(person: Person, wrongGuesses: number): RevealedHint[] {
  const count = Math.min(wrongGuesses, HINT_ORDER.length)
  return HINT_ORDER.slice(0, count).map((key) => {
    const value =
      key === 'initials' ? deriveInitials(person.name) : person.hints[key]
    return { label: LABELS[key], value }
  })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- hints`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/hints.ts src/game/hints.test.ts
git commit -m "feat: add hint progression logic"
```

---

## Task 7: Share text generation (TDD)

**Files:**
- Create: `src/game/share.ts`
- Test: `src/game/share.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/share.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { buildShareText } from './share'

describe('buildShareText', () => {
  it('formats a win with red squares then green', () => {
    expect(buildShareText({ puzzleNumber: 142, won: true, guessCount: 3, maxGuesses: 6 }))
      .toBe('MetroWreckLabs #142\n🟥🟥🟩 (3/6)\n🌍 born → 💀 died')
  })
  it('formats a first-try win', () => {
    expect(buildShareText({ puzzleNumber: 1, won: true, guessCount: 1, maxGuesses: 6 }))
      .toBe('MetroWreckLabs #1\n🟩 (1/6)\n🌍 born → 💀 died')
  })
  it('formats a loss with all red and X/6', () => {
    expect(buildShareText({ puzzleNumber: 5, won: false, guessCount: 6, maxGuesses: 6 }))
      .toBe('MetroWreckLabs #5\n🟥🟥🟥🟥🟥🟥 (X/6)\n🌍 born → 💀 died')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- share`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/game/share.ts`:

```ts
export interface ShareInput {
  puzzleNumber: number
  won: boolean
  guessCount: number  // number of guesses used (the winning guess counts)
  maxGuesses: number
}

export function buildShareText({ puzzleNumber, won, guessCount, maxGuesses }: ShareInput): string {
  const wrong = won ? guessCount - 1 : guessCount
  const grid = '🟥'.repeat(wrong) + (won ? '🟩' : '')
  const score = won ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}`
  return `MetroWreckLabs #${puzzleNumber}\n${grid} (${score})\n🌍 born → 💀 died`
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- share`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/share.ts src/game/share.test.ts
git commit -m "feat: add shareable result text"
```

---

## Task 8: Game state reducer + hook (TDD)

**Files:**
- Create: `src/game/useGame.ts`
- Test: `src/game/useGame.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/game/useGame.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { gameReducer, initGame } from './useGame'
import type { Person } from '../data/types'

const mozart = {
  id: 'mozart',
  name: 'Wolfgang Amadeus Mozart',
  acceptedAnswers: ['mozart'],
} as Person

describe('gameReducer', () => {
  it('starts in playing status with no guesses', () => {
    const s = initGame(mozart)
    expect(s.status).toBe('playing')
    expect(s.guesses).toEqual([])
  })

  it('records a wrong guess and stays playing', () => {
    let s = initGame(mozart)
    s = gameReducer(s, { type: 'guess', name: 'Beethoven' })
    expect(s.guesses).toEqual([{ name: 'Beethoven', correct: false }])
    expect(s.status).toBe('playing')
  })

  it('wins on a correct guess', () => {
    let s = initGame(mozart)
    s = gameReducer(s, { type: 'guess', name: 'Mozart' })
    expect(s.status).toBe('won')
    expect(s.guesses.length).toBe(1)
  })

  it('loses after MAX_GUESSES wrong guesses', () => {
    let s = initGame(mozart)
    for (let i = 0; i < 6; i++) s = gameReducer(s, { type: 'guess', name: `wrong${i}` })
    expect(s.status).toBe('lost')
  })

  it('ignores guesses once the round is over', () => {
    let s = initGame(mozart)
    s = gameReducer(s, { type: 'guess', name: 'Mozart' }) // win
    s = gameReducer(s, { type: 'guess', name: 'Beethoven' })
    expect(s.guesses.length).toBe(1)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- useGame`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/game/useGame.ts`:

```ts
import { useReducer } from 'react'
import type { Person } from '../data/types'
import { isCorrectGuess } from './match'
import { MAX_GUESSES } from './constants'

export interface GuessRecord {
  name: string
  correct: boolean
}

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
  person: Person
  guesses: GuessRecord[]
  status: GameStatus
}

export type GameAction =
  | { type: 'guess'; name: string }
  | { type: 'reset'; person: Person }

export function initGame(person: Person): GameState {
  return { person, guesses: [], status: 'playing' }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'reset':
      return initGame(action.person)
    case 'guess': {
      if (state.status !== 'playing') return state
      const correct = isCorrectGuess(action.name, state.person)
      const guesses = [...state.guesses, { name: action.name, correct }]
      let status: GameStatus = 'playing'
      if (correct) status = 'won'
      else if (guesses.length >= MAX_GUESSES) status = 'lost'
      return { ...state, guesses, status }
    }
    default:
      return state
  }
}

/** Convenience hook wrapping the reducer. */
export function useGame(person: Person) {
  const [state, dispatch] = useReducer(gameReducer, person, initGame)
  return { state, dispatch }
}

/** Count of wrong guesses so far (drives hint reveal). */
export function wrongCount(state: GameState): number {
  return state.guesses.filter((g) => !g.correct).length
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- useGame`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/game/useGame.ts src/game/useGame.test.ts
git commit -m "feat: add game state reducer and hook"
```

---

## Task 9: Wikidata harvest script to grow the dataset

**Files:**
- Create: `scripts/harvest-wikidata.mjs`
- Modify: `src/data/people.json` (regenerated/merged output)

- [ ] **Step 1: Write the harvest script**

Create `scripts/harvest-wikidata.mjs`. It queries Wikidata for famous people with full birth/death place coordinates + dates and the hint fields, normalizes them to our `Person` shape, de-duplicates against existing ids, and writes the merged list. Sitelink count is used as a fame proxy so entries stay recognizable.

```js
// Run with: node scripts/harvest-wikidata.mjs
// One-time data harvest. Review the output before committing.
import { readFileSync, writeFileSync } from 'node:fs'

const ENDPOINT = 'https://query.wikidata.org/sparql'

// Most-linked humans with full birth/death place coords + dates + hint fields.
const QUERY = `
SELECT ?person ?personLabel ?birthDate ?deathDate
       ?birthPlaceLabel ?bLat ?bLng
       ?deathPlaceLabel ?dLat ?dLng
       ?genderLabel ?occupationLabel ?nationalityLabel ?sitelinks WHERE {
  ?person wdt:P31 wd:Q5 ;
          wikibase:sitelinks ?sitelinks ;
          wdt:P569 ?birthDate ;
          wdt:P570 ?deathDate ;
          wdt:P19 ?birthPlace ;
          wdt:P20 ?deathPlace .
  ?birthPlace wdt:P625 ?bCoord .
  ?deathPlace wdt:P625 ?dCoord .
  BIND(geof:latitude(?bCoord) AS ?bLat)
  BIND(geof:longitude(?bCoord) AS ?bLng)
  BIND(geof:latitude(?dCoord) AS ?dLat)
  BIND(geof:longitude(?dCoord) AS ?dLng)
  OPTIONAL { ?person wdt:P21 ?gender. }
  OPTIONAL { ?person wdt:P106 ?occupation. }
  OPTIONAL { ?person wdt:P27 ?nationality. }
  FILTER(?sitelinks > 80)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 400
`

function centuryLabel(birthISO, deathISO) {
  const by = parseInt(birthISO.slice(0, 4), 10)
  const dy = parseInt(deathISO.slice(0, 4), 10)
  const century = (y) => Math.floor((Math.abs(y) - 1) / 100) + 1
  const ord = (n) => {
    const v = n % 100
    const suffix = (v >= 11 && v <= 13) ? 'th'
      : (['th', 'st', 'nd', 'rd'][n % 10] || 'th')
    return `${n}${suffix} century`
  }
  const bc = century(by), dc = century(dy)
  return bc === dc ? ord(bc) : `${ord(bc)}–${ord(dc)}`
}

function slug(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function main() {
  const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(QUERY)}&format=json`, {
    headers: { 'User-Agent': 'MetroWreckLabs/1.0 (harvest script)' },
  })
  if (!res.ok) throw new Error(`Wikidata ${res.status}`)
  const json = await res.json()

  const byId = new Map()
  for (const b of json.results.bindings) {
    const name = b.personLabel?.value
    if (!name || /^Q\d+$/.test(name)) continue
    const birthDate = b.birthDate.value.slice(0, 10)
    const deathDate = b.deathDate.value.slice(0, 10)
    const id = slug(name)
    if (byId.has(id)) continue
    byId.set(id, {
      id,
      name,
      birth: {
        date: birthDate,
        place: b.birthPlaceLabel?.value ?? 'Unknown',
        lat: +(+b.bLat.value).toFixed(2),
        lng: +(+b.bLng.value).toFixed(2),
      },
      death: {
        date: deathDate,
        place: b.deathPlaceLabel?.value ?? 'Unknown',
        lat: +(+b.dLat.value).toFixed(2),
        lng: +(+b.dLng.value).toFixed(2),
      },
      hints: {
        century: centuryLabel(birthDate, deathDate),
        gender: b.genderLabel?.value ?? 'Unknown',
        nationality: b.nationalityLabel?.value ?? 'Unknown',
        profession: b.occupationLabel?.value ?? 'Unknown',
      },
      bio: '',
      acceptedAnswers: [name.toLowerCase()],
    })
  }

  // Merge with existing hand-verified entries (existing ids win).
  const existing = JSON.parse(readFileSync('src/data/people.json', 'utf8'))
  const existingIds = new Set(existing.map((p) => p.id))
  const harvested = [...byId.values()].filter((p) => !existingIds.has(p.id))
  const merged = [...existing, ...harvested].slice(0, 150)

  writeFileSync('src/data/people.json', JSON.stringify(merged, null, 2) + '\n')
  console.log(`Wrote ${merged.length} people (${harvested.length} newly harvested).`)
  console.log('REVIEW before committing: spot-check dates, coords, and that names are recognizable.')
}

main().catch((e) => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Run the harvest**

Run: `node scripts/harvest-wikidata.mjs`
Expected: prints "Wrote 150 people (… newly harvested)." and updates `src/data/people.json`.

- [ ] **Step 3: Review the output (manual, required)**

Open `src/data/people.json` and spot-check ~10 random entries:
- Birth/death dates look right and `death` is after `birth`.
- Coordinates are plausible (not 0,0 or swapped).
- `name` is a recognizable person.
- Remove any entry that is obscure, has "Unknown" hints, or bad data. Add `acceptedAnswers` aliases (surname-only, common spellings) for the well-known ones.
- For your favorites, fill in a one-line `bio` (others can stay `""`; the reveal screen falls back gracefully — see Task 14).

- [ ] **Step 4: Re-run the logic tests against the real data shape**

Run: `npm run test`
Expected: all prior tests still PASS (data shape unchanged).

- [ ] **Step 5: Commit**

```bash
git add scripts/harvest-wikidata.mjs src/data/people.json
git commit -m "feat: harvest curated people list from Wikidata"
```

---

## Task 10: MapView component

**Files:**
- Create: `src/components/MapView.tsx`
- Modify: `src/main.tsx` (import Leaflet CSS — see Step 2)

- [ ] **Step 1: Create the component**

Create `src/components/MapView.tsx`. Two circle markers (green = birth, red = death) with tooltips showing place + date. Uses `CircleMarker` so we avoid Leaflet's default-icon asset path issues. Fits bounds to both points.

```tsx
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import type { GeoPoint } from '../data/types'

interface Props {
  birth: GeoPoint
  death: GeoPoint
}

function fmtDate(iso: string): string {
  // Show year prominently; ISO already human-enough for v1.
  return iso
}

export function MapView({ birth, death }: Props) {
  const bounds: [number, number][] = [
    [birth.lat, birth.lng],
    [death.lat, death.lng],
  ]
  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [60, 60] }}
      scrollWheelZoom
      className="map"
      worldCopyJump
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <CircleMarker center={[birth.lat, birth.lng]} radius={10}
        pathOptions={{ color: '#10803a', fillColor: '#34d399', fillOpacity: 0.9 }}>
        <Tooltip permanent direction="top">🟢 Born {fmtDate(birth.date)}</Tooltip>
      </CircleMarker>
      <CircleMarker center={[death.lat, death.lng]} radius={10}
        pathOptions={{ color: '#991b1b', fillColor: '#f87171', fillOpacity: 0.9 }}>
        <Tooltip permanent direction="top">🔴 Died {fmtDate(death.date)}</Tooltip>
      </CircleMarker>
    </MapContainer>
  )
}
```

- [ ] **Step 2: Import Leaflet's CSS globally**

In `src/main.tsx`, add at the top with the other imports:

```ts
import 'leaflet/dist/leaflet.css'
```

- [ ] **Step 3: Smoke-test the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/MapView.tsx src/main.tsx
git commit -m "feat: add MapView with birth/death markers"
```

---

## Task 11: GuessInput component (TDD)

**Files:**
- Create: `src/components/GuessInput.tsx`
- Test: `src/components/GuessInput.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/GuessInput.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuessInput } from './GuessInput'

const names = ['Wolfgang Amadeus Mozart', 'Marie Curie', 'Abraham Lincoln']

describe('GuessInput', () => {
  it('shows matching suggestions as the user types', () => {
    render(<GuessInput names={names} disabled={false} onGuess={() => {}} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'mar' } })
    expect(screen.getByText('Marie Curie')).toBeInTheDocument()
    expect(screen.queryByText('Abraham Lincoln')).not.toBeInTheDocument()
  })

  it('submits the typed name on form submit', () => {
    const onGuess = vi.fn()
    render(<GuessInput names={names} disabled={false} onGuess={onGuess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Marie Curie' } })
    fireEvent.submit(screen.getByRole('textbox'))
    expect(onGuess).toHaveBeenCalledWith('Marie Curie')
  })

  it('submits a suggestion when clicked', () => {
    const onGuess = vi.fn()
    render(<GuessInput names={names} disabled={false} onGuess={onGuess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'lin' } })
    fireEvent.click(screen.getByText('Abraham Lincoln'))
    expect(onGuess).toHaveBeenCalledWith('Abraham Lincoln')
  })

  it('does not submit empty input', () => {
    const onGuess = vi.fn()
    render(<GuessInput names={names} disabled={false} onGuess={onGuess} />)
    fireEvent.submit(screen.getByRole('textbox'))
    expect(onGuess).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- GuessInput`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/components/GuessInput.tsx`:

```tsx
import { useState } from 'react'
import { normalizeName } from '../game/match'

interface Props {
  names: string[]
  disabled: boolean
  onGuess: (name: string) => void
}

export function GuessInput({ names, disabled, onGuess }: Props) {
  const [value, setValue] = useState('')

  const q = normalizeName(value)
  const suggestions = q.length === 0
    ? []
    : names.filter((n) => normalizeName(n).includes(q)).slice(0, 6)

  function submit(name: string) {
    const v = name.trim()
    if (!v) return
    onGuess(v)
    setValue('')
  }

  return (
    <form
      className="guess-input"
      onSubmit={(e) => { e.preventDefault(); submit(value) }}
    >
      <input
        type="text"
        role="textbox"
        placeholder="Who is the mystery person?"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        aria-label="guess"
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((n) => (
            <li key={n}><button type="button" onClick={() => submit(n)}>{n}</button></li>
          ))}
        </ul>
      )}
    </form>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- GuessInput`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/GuessInput.tsx src/components/GuessInput.test.tsx
git commit -m "feat: add autocomplete guess input"
```

---

## Task 12: HintPanel and GuessHistory components

**Files:**
- Create: `src/components/HintPanel.tsx`
- Create: `src/components/GuessHistory.tsx`

- [ ] **Step 1: Create HintPanel**

Create `src/components/HintPanel.tsx`:

```tsx
import type { RevealedHint } from '../game/hints'
import { MAX_GUESSES } from '../game/constants'

interface Props {
  hints: RevealedHint[]
  guessesLeft: number
}

export function HintPanel({ hints, guessesLeft }: Props) {
  return (
    <div className="hint-panel">
      <div className="guesses-left">{guessesLeft} of {MAX_GUESSES} guesses left</div>
      {hints.length === 0 ? (
        <p className="hint-empty">No hints yet — guess from the map, or a wrong guess unlocks a clue.</p>
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

- [ ] **Step 2: Create GuessHistory**

Create `src/components/GuessHistory.tsx`:

```tsx
import type { GuessRecord } from '../game/useGame'

interface Props {
  guesses: GuessRecord[]
}

export function GuessHistory({ guesses }: Props) {
  if (guesses.length === 0) return null
  return (
    <ul className="guess-history">
      {guesses.map((g, i) => (
        <li key={i} className={g.correct ? 'correct' : 'wrong'}>
          {g.correct ? '🟩' : '🟥'} {g.name}
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 3: Smoke-test the build**

Run: `npm run build`
Expected: builds with no type errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/HintPanel.tsx src/components/GuessHistory.tsx
git commit -m "feat: add hint panel and guess history"
```

---

## Task 13: ModeToggle component

**Files:**
- Create: `src/components/ModeToggle.tsx`

- [ ] **Step 1: Create the component**

Create `src/components/ModeToggle.tsx`:

```tsx
export type Mode = 'daily' | 'endless'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="mode-toggle" role="tablist">
      <button
        role="tab"
        aria-selected={mode === 'daily'}
        className={mode === 'daily' ? 'active' : ''}
        onClick={() => onChange('daily')}
      >Daily</button>
      <button
        role="tab"
        aria-selected={mode === 'endless'}
        className={mode === 'endless' ? 'active' : ''}
        onClick={() => onChange('endless')}
      >Endless</button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ModeToggle.tsx
git commit -m "feat: add daily/endless mode toggle"
```

---

## Task 14: ResultScreen component (TDD)

**Files:**
- Create: `src/components/ResultScreen.tsx`
- Test: `src/components/ResultScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/ResultScreen.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultScreen } from './ResultScreen'
import type { Person } from '../data/types'

const mozart = {
  id: 'mozart', name: 'Wolfgang Amadeus Mozart',
  bio: 'A Classical-era composer.',
} as Person

describe('ResultScreen', () => {
  it('announces a win with the name', () => {
    render(<ResultScreen person={mozart} won shareText="x" onPlayAgain={null} />)
    expect(screen.getByText(/Solved/i)).toBeInTheDocument()
    expect(screen.getByText(/Wolfgang Amadeus Mozart/)).toBeInTheDocument()
  })

  it('reveals the name on a loss', () => {
    render(<ResultScreen person={mozart} won={false} shareText="x" onPlayAgain={null} />)
    expect(screen.getByText(/It was/i)).toBeInTheDocument()
    expect(screen.getByText(/Wolfgang Amadeus Mozart/)).toBeInTheDocument()
  })

  it('shows a Play again button in endless mode', () => {
    const onPlayAgain = vi.fn()
    render(<ResultScreen person={mozart} won shareText="x" onPlayAgain={onPlayAgain} />)
    fireEvent.click(screen.getByText(/Play again/i))
    expect(onPlayAgain).toHaveBeenCalled()
  })

  it('hides Play again when onPlayAgain is null (daily)', () => {
    render(<ResultScreen person={mozart} won shareText="x" onPlayAgain={null} />)
    expect(screen.queryByText(/Play again/i)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- ResultScreen`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

Create `src/components/ResultScreen.tsx`:

```tsx
import type { Person } from '../data/types'

interface Props {
  person: Person
  won: boolean
  shareText: string
  onPlayAgain: (() => void) | null
}

export function ResultScreen({ person, won, shareText, onPlayAgain }: Props) {
  async function share() {
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      // clipboard unavailable — no-op for v1
    }
  }

  return (
    <div className="result-screen">
      <h2>{won ? '🎉 Solved!' : '💀 Out of guesses'}</h2>
      <p className="answer">
        {won ? 'It was ' : 'It was '}<strong>{person.name}</strong>
      </p>
      {person.bio && <p className="bio">{person.bio}</p>}
      <pre className="share-preview">{shareText}</pre>
      <div className="result-actions">
        <button onClick={share}>Share result</button>
        {onPlayAgain && <button onClick={onPlayAgain}>Play again</button>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- ResultScreen`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/ResultScreen.tsx src/components/ResultScreen.test.tsx
git commit -m "feat: add result screen with share"
```

---

## Task 15: Wire everything together in App

**Files:**
- Modify: `src/App.tsx` (replace template content)

- [ ] **Step 1: Implement App**

Replace `src/App.tsx` with:

```tsx
import { useMemo, useReducer, useState } from 'react'
import people from './data/people.json'
import type { Person } from './data/types'
import { MapView } from './components/MapView'
import { GuessInput } from './components/GuessInput'
import { HintPanel } from './components/HintPanel'
import { GuessHistory } from './components/GuessHistory'
import { ResultScreen } from './components/ResultScreen'
import { ModeToggle, type Mode } from './components/ModeToggle'
import { gameReducer, initGame, wrongCount } from './game/useGame'
import { revealedHints } from './game/hints'
import { buildShareText } from './game/share'
import { dailyIndex, todayISO, dailyNumber } from './game/selectDaily'
import { EPOCH, MAX_GUESSES } from './game/constants'

const ALL = people as Person[]

function pickDaily(): { person: Person; number: number } {
  const today = todayISO()
  return {
    person: ALL[dailyIndex(today, EPOCH, ALL.length)],
    number: dailyNumber(today, EPOCH),
  }
}

function pickRandom(): Person {
  return ALL[Math.floor(Math.random() * ALL.length)]
}

export default function App() {
  const [mode, setMode] = useState<Mode>('daily')
  const daily = useMemo(pickDaily, [])
  const [endlessPerson, setEndlessPerson] = useState<Person>(pickRandom)

  const person = mode === 'daily' ? daily.person : endlessPerson
  const [state, dispatch] = useReducer(gameReducer, person, initGame)

  // Mode switches and "Play again" call dispatch({ type: 'reset', person })
  // explicitly (see handlers below) to re-init the round for the new person.
  return (
    <div className="app">
      <header className="app-header">
        <h1>MetroWreckLabs</h1>
        <ModeToggle
          mode={mode}
          onChange={(m) => {
            setMode(m)
            const next = m === 'daily' ? daily.person : endlessPerson
            dispatch({ type: 'reset', person: next })
          }}
        />
      </header>

      <MapView birth={person.birth} death={person.death} />

      <main className="controls">
        {mode === 'daily' && <p className="puzzle-no">Daily #{daily.number}</p>}

        {state.status === 'playing' ? (
          <>
            <GuessInput
              names={ALL.map((p) => p.name)}
              disabled={false}
              onGuess={(name) => dispatch({ type: 'guess', name })}
            />
            <HintPanel
              hints={revealedHints(person, wrongCount(state))}
              guessesLeft={MAX_GUESSES - state.guesses.length}
            />
            <GuessHistory guesses={state.guesses} />
          </>
        ) : (
          <ResultScreen
            person={person}
            won={state.status === 'won'}
            shareText={buildShareText({
              puzzleNumber: mode === 'daily' ? daily.number : 0,
              won: state.status === 'won',
              guessCount: state.guesses.length,
              maxGuesses: MAX_GUESSES,
            })}
            onPlayAgain={
              mode === 'endless'
                ? () => {
                    const next = pickRandom()
                    setEndlessPerson(next)
                    dispatch({ type: 'reset', person: next })
                  }
                : null
            }
          />
        )}
      </main>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript JSON import works**

`tsconfig` from the Vite template enables `resolveJsonModule`. Run: `npm run build`
Expected: builds with no errors. If JSON import errors, add `"resolveJsonModule": true` to `tsconfig.app.json`'s `compilerOptions`.

- [ ] **Step 3: Run the full test suite**

Run: `npm run test`
Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx tsconfig*.json
git commit -m "feat: wire game together in App"
```

---

## Task 16: Layout + theme styling (Layout B)

**Files:**
- Modify: `src/index.css` (theme/reset)
- Modify: `src/App.css` (layout) — and import it in `App.tsx`

- [ ] **Step 1: Replace `src/index.css` with theme + reset**

```css
:root {
  --bg: #0b1f33;
  --panel: #0f2942;
  --panel-2: #13314f;
  --border: #1e3a5f;
  --text: #e2e8f0;
  --muted: #94a3b8;
  --green: #34d399;
  --red: #f87171;
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  background: var(--bg);
  color: var(--text);
}
button { font: inherit; cursor: pointer; }
```

- [ ] **Step 2: Replace `src/App.css` with Layout B**

```css
.app { max-width: 720px; margin: 0 auto; min-height: 100vh; display: flex; flex-direction: column; }
.app-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; }
.app-header h1 { font-size: 20px; margin: 0; }

.mode-toggle { display: flex; gap: 4px; background: var(--panel); border-radius: 8px; padding: 4px; }
.mode-toggle button { background: transparent; color: var(--muted); border: 0; padding: 6px 14px; border-radius: 6px; }
.mode-toggle button.active { background: var(--panel-2); color: var(--text); }

.map { height: 45vh; min-height: 280px; width: 100%; }

.controls { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
.puzzle-no { margin: 0; color: var(--muted); font-size: 13px; }

.guess-input { position: relative; }
.guess-input input { width: 100%; padding: 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel); color: var(--text); font-size: 16px; }
.suggestions { list-style: none; margin: 4px 0 0; padding: 0; position: absolute; width: 100%; background: var(--panel); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; z-index: 1000; }
.suggestions button { display: block; width: 100%; text-align: left; padding: 10px 12px; background: transparent; color: var(--text); border: 0; }
.suggestions button:hover { background: var(--panel-2); }

.hint-panel { background: var(--panel); border: 1px solid var(--border); border-radius: 8px; padding: 12px; }
.guesses-left { font-size: 13px; color: var(--muted); margin-bottom: 8px; }
.hints, .guess-history { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.hint-label { color: var(--muted); }
.hint-empty { color: var(--muted); margin: 0; }

.guess-history li { background: var(--panel-2); border-radius: 6px; padding: 8px 10px; }

.result-screen { background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px; text-align: center; }
.result-screen .answer { font-size: 18px; }
.result-screen .bio { color: var(--muted); }
.share-preview { background: var(--bg); border-radius: 8px; padding: 12px; white-space: pre-wrap; font-family: inherit; }
.result-actions { display: flex; gap: 8px; justify-content: center; }
.result-actions button { padding: 10px 18px; border-radius: 8px; border: 1px solid var(--border); background: var(--panel-2); color: var(--text); }

@media (max-width: 480px) {
  .map { height: 38vh; }
  .app-header { flex-direction: column; gap: 8px; align-items: stretch; }
}
```

- [ ] **Step 3: Ensure `App.css` is imported**

At the top of `src/App.tsx`, confirm/add:

```ts
import './App.css'
```

- [ ] **Step 4: Build to confirm no errors**

Run: `npm run build`
Expected: builds clean.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/App.css src/App.tsx
git commit -m "style: layout B theme and responsive styles"
```

---

## Task 17: Manual verification + README

**Files:**
- Create: `README.md`

- [ ] **Step 1: Run the dev server and play**

Run: `npm run dev`
Open the printed localhost URL and verify:
- Map shows green (born) and red (died) pins with date tooltips, zoomed to fit both.
- Typing a name shows suggestions; submitting a wrong name adds a 🟥 row and reveals the **century** hint.
- Hints accumulate in order (century → gender → nationality → profession → initials) across wrong guesses.
- A correct guess shows the win result with the bio + share preview.
- Six wrong guesses shows the loss result revealing the name.
- Switching to **Endless** starts a fresh random round; **Play again** loads a new person.
- Daily mode shows "Daily #N" and no Play again button.
- Resize to a narrow width — layout stays usable (map shrinks, controls stack).

- [ ] **Step 2: Run the full suite once more**

Run: `npm run test`
Expected: all tests PASS.

- [ ] **Step 3: Write README**

Create `README.md`:

```markdown
# MetroWreckLabs

A daily "guess the mystery person" map game. A green pin marks where someone was
born (with the date) and a red pin where they died — deduce who they are in 6 guesses.

## Develop

```bash
npm install
npm run dev      # local dev server
npm run test     # run unit + component tests
npm run build    # static production build → dist/
```

## Data

`src/data/people.json` is the curated dataset, harvested once from Wikidata via
`node scripts/harvest-wikidata.mjs` and hand-reviewed. See
`docs/superpowers/specs/2026-06-21-metrowrecklabs-design.md` for the design.

## Modes

- **Daily** — same person for everyone, chosen by date.
- **Endless** — random person each round.
```

- [ ] **Step 4: Commit**

```bash
git add README.md
git commit -m "docs: add README and verify gameplay"
```

---

## Notes for the implementer

- **Leaflet markers:** we use `CircleMarker` rather than the default pin icon to avoid Vite/Leaflet's known marker-image asset-path breakage. Don't swap to `Marker` without fixing icon URLs.
- **jsdom + Leaflet:** `MapView` is intentionally untested by unit tests (Leaflet needs a real DOM/size). It's verified manually in Task 17. Keep map code thin; all logic lives in tested `src/game/` modules.
- **BC dates:** the starter dataset includes Cleopatra with simplified ancient dates; the harvest script targets modern figures. Don't rely on date arithmetic being meaningful for BC entries — only the `century` hint string is shown.
- **`acceptedAnswers`:** always lowercase in the data; `isCorrectGuess` normalizes both sides, but keeping data lowercase avoids surprises.
```

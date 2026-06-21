# MetroWreckLabs — Design Spec

**Date:** 2026-06-21
**Status:** Approved (v1 scope)

## Concept

A daily geography/history guessing game in the spirit of TrainWreckLabs daily
puzzles. The world map shows two pins:

- A **green pin** — where the mystery person was **born**, labeled with the birth date.
- A **red pin** — where the mystery person **died**, labeled with the death date.

From those two points (and progressive hints), the player deduces who the
mystery person is.

## Modes

- **Daily** — everyone gets the same person each day. Selected deterministically
  from the date: `index = daysSince(EPOCH) % people.length` where `EPOCH` is a
  fixed launch date. No server logic required.
- **Endless** — a random person each round, for unlimited practice. (Later,
  optionally augmented with live Wikidata pulls — out of scope for v1.)

## Gameplay

- **6 guesses** per round.
- Guesses are **free-text name entry with autocomplete** — typing filters the
  list of people by `name`; the dropdown suggests matches.
- The two map pins + their dates are visible from **guess 1**.
- A guess is correct if it matches any string in the person's `acceptedAnswers`
  (case-insensitive, trimmed).
- Each **wrong** guess **auto-reveals** the next hint, ordered
  least-helpful → most-helpful:
  1. Century / lifespan
  2. Gender
  3. Nationality
  4. Profession / field
  5. Initials
- After guess 6 (or earlier solve), the round ends.

## End of round

- Shows **win/lose + guess count** (e.g. "Solved in 3/6", or "X/6 — it was …").
- The redacted one-line **bio** is revealed on this screen, with the name filled in.
- One-tap **shareable emoji grid** (Wordle-style), e.g.:

  ```
  MetroWreckLabs #142
  🟥🟥🟩 (3/6)
  🌍 born → 💀 died
  ```

- **No accounts, no points/scoring, no persistence** in v1. Refreshing
  mid-round restarts the round.

## Layout (Option B)

- **Map across the top** — interactive, pannable/zoomable, with the green and
  red pins and date labels.
- **Below the map, stacked:** guess box (with autocomplete) → hint panel →
  guess history.
- Mobile-friendly; collapses cleanly to phone widths.

## Data

The "database" is a curated static JSON file committed to the repo
(`src/data/people.json`), loaded at runtime. No backend/database.

### Sourcing

Harvested **once** from a Wikidata **SPARQL** query selecting people with a
known birth date, birthplace coordinates, death date, and death-place
coordinates, plus profession / nationality / gender for hints. Results are
**cleaned and reviewed** before being committed. The live game does **not**
depend on Wikidata at runtime in v1.

### Size

~**150 recognizable people** for the initial list — enough that the daily
puzzle does not repeat for ~5 months, while keeping every entry famous enough
to be a fair guess.

### Record shape

```json
{
  "id": "mozart",
  "name": "Wolfgang Amadeus Mozart",
  "birth": { "date": "1756-01-27", "place": "Salzburg, Austria", "lat": 47.80, "lng": 13.04 },
  "death": { "date": "1791-12-05", "place": "Vienna, Austria", "lat": 48.21, "lng": 16.37 },
  "hints": {
    "century": "18th century",
    "gender": "Male",
    "nationality": "Austrian",
    "profession": "Composer"
  },
  "bio": "A prolific and influential composer of the Classical period.",
  "acceptedAnswers": ["mozart", "wolfgang amadeus mozart"]
}
```

The `initials` hint is derived from `name` at runtime (no separate field needed).

## Tech stack

- **React** — UI and game state (current guesses, revealed hints, win/lose).
- **Vite** — dev server (hot reload) and static build tooling.
- **react-leaflet / Leaflet** — interactive map rendering, using free
  OpenStreetMap tiles.
- Deploys as **static files** (e.g. Netlify, GitHub Pages, Vercel).

## Known limitations (acceptable for v1)

- **Answers are client-side / plaintext.** A determined player can inspect
  `people.json` or pre-compute the daily answer via DevTools. Acceptable for v1.
  Future mitigations: hash/encode answers (deters casual peeking), or a small
  serverless function that validates guesses and gates hints (defeats inspection
  properly, adds a backend).
- **Bios are best-effort.** Only the 8 hand-curated entries have a one-line
  `bio`; the ~137 Wikidata-harvested entries ship with an empty bio, so the
  result screen shows no description for most puzzles. Accepted for v1; can be
  backfilled later from Wikidata `schema:description`.

## Out of scope for v1

- Accounts, login, leaderboards.
- Streak / win-percentage / guess-distribution stats.
- Persistence (resume today's puzzle after refresh).
- Server-side guess validation.
- Live Wikidata fetching at runtime.
- Points-based scoring.
- "Warmer" proximity nudges on close guesses.

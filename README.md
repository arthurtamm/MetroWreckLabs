# MetroWreckLabs

A daily "guess the mystery person" map game. A green pin marks where someone was
born (with the date) and a red pin where they died — deduce who they are in 6 guesses.
Each wrong guess unlocks a new hint, from least to most helpful
(century → gender → nationality → profession → initials).

## Develop

```bash
npm install
npm run dev      # local dev server (http://localhost:5173)
npm run test     # run unit + component tests
npm run build    # static production build → dist/
```

## Modes

- **Daily** — the same person for everyone, chosen deterministically from the date.
- **Endless** — a random person each round.

## Data

`src/data/people.json` is the curated dataset (~145 people), harvested once from
Wikidata via `node scripts/harvest-wikidata.mjs` and reviewed/cleaned. The live
game reads this static file — there is no backend. Note: because everything runs
client-side, the answer is technically discoverable in the page source (acceptable
for v1).

## Design docs

- Spec: `docs/superpowers/specs/2026-06-21-metrowrecklabs-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-21-metrowrecklabs.md`

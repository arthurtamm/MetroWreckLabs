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

### Verifying the dataset (do this whenever people are added)

Wikidata's raw fields are noisy — professions are often an arbitrary occupation
(e.g. it labelled Walt Disney a "painter"), nationalities come through as country
or historical-state names, and names aren't always the common form. So **after
harvesting, fact-check the new entries with an agent pass** rather than relying on
a runtime check. For each person the agent should confirm/correct:

- `name` — the common English form a player would type (drives autocomplete + initials).
- `hints.profession` — the single best-known role.
- `hints.nationality` — a demonym adjective ("French", not "Kingdom of France").
- `acceptedAnswers` — lowercase: canonical name, surname, and common variants.
- removals — duplicates of a more-canonical entry, obscure figures, or people whose
  birth and death places are identical (a same-place puzzle shows only one pin).

A handy split is to batch the dataset (~45 people per agent) and have each emit a
JSON patch keyed by `id`, then apply the patches and de-duplicate by canonical name.

## Design docs

- Spec: `docs/superpowers/specs/2026-06-21-metrowrecklabs-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-21-metrowrecklabs.md`

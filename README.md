# MetroWreckLabs

A platform for daily puzzle games. The hub lists the games; each game lives in
its own module and is code-split so opening the hub doesn't download all of them.

## Games

- **Lifespan** (`#/lifespan`) — a green pin marks where someone was born and a
  red pin where they died. Deduce who they are in 6 guesses; each wrong guess
  unlocks a hint (gender & nationality → profession → initials).

## Develop

```bash
npm install
npm run dev      # local dev server (http://localhost:5173)
npm run test     # run unit + component tests
npm run build    # static production build → dist/
```

## Lifespan modes

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

## Design docs

- Spec: `docs/superpowers/specs/2026-06-21-metrowrecklabs-design.md`
- Implementation plan: `docs/superpowers/plans/2026-06-21-metrowrecklabs.md`
- Platform spec: `docs/superpowers/specs/2026-09-22-platform-shell-design.md`
- Platform plan: `docs/superpowers/plans/2026-09-22-platform-shell.md`

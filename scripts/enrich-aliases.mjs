// Enrich each person's acceptedAnswers with their name in many languages plus
// Wikidata aliases — so "Ferdinand Magellan" and "Fernão de Magalhães" both
// resolve to the same person. Deterministic; run whenever people are added.
//
// Run: node scripts/enrich-aliases.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const API = 'https://www.wikidata.org/w/api.php'
const HEADERS = { 'User-Agent': 'MetroWreckLabs/1.0 (alias enrichment)' }

// Latin-script + widely-typed languages; the native label (P1559) is always kept.
const LANGS = new Set([
  'en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'ca', 'gl', 'eu', 'ro', 'la',
  'pl', 'cs', 'sk', 'sl', 'hr', 'bs', 'hu', 'sv', 'da', 'nb', 'nn', 'no',
  'fi', 'et', 'lt', 'lv', 'tr', 'az', 'id', 'ms', 'vi', 'af', 'cy', 'ga',
  'is', 'sq', 'mt', 'eo',
])

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const normalize = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/\s+/g, ' ')

// Fetch with maxlag + backoff; retry until the response has the expected shape.
async function apiGet(params, validate) {
  const url = `${API}?${params}&format=json&maxlag=5`
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, { headers: HEADERS })
      if (res.status === 429 || res.status === 503) { await sleep(2000 * (attempt + 1)); continue }
      const json = await res.json()
      if (json.error) { await sleep(2000 * (attempt + 1)); continue } // e.g. maxlag
      if (validate(json)) return json
      await sleep(1500 * (attempt + 1)) // unexpected shape — likely throttled
    } catch {
      await sleep(1500 * (attempt + 1))
    }
  }
  return null
}

async function searchQids(name) {
  const json = await apiGet(
    `action=wbsearchentities&search=${encodeURIComponent(name)}&language=en&type=item&limit=7`,
    (j) => Array.isArray(j.search),
  )
  return json ? json.search.map((s) => s.id) : []
}

async function getEntities(ids) {
  const json = await apiGet(
    `action=wbgetentities&ids=${ids.join('|')}&props=labels|aliases|claims`,
    (j) => j.entities,
  )
  return json ? json.entities : {}
}

const isHuman = (e) =>
  (e.claims?.P31 || []).some((c) => c.mainsnak?.datavalue?.value?.id === 'Q5')

function birthYear(e) {
  const t = e.claims?.P569?.[0]?.mainsnak?.datavalue?.value?.time
  if (!t) return null
  const m = /^([+-]?\d+)-/.exec(t)
  return m ? parseInt(m[1], 10) : null
}

function collectNames(e) {
  const out = []
  for (const [lang, label] of Object.entries(e.labels || {})) {
    if (LANGS.has(lang)) out.push(label.value)
  }
  for (const [lang, list] of Object.entries(e.aliases || {})) {
    if (LANGS.has(lang)) for (const a of list) out.push(a.value)
  }
  for (const c of e.claims?.P1559 || []) {
    const v = c.mainsnak?.datavalue?.value?.text
    if (v) out.push(v)
  }
  return out
}

async function main() {
  const people = JSON.parse(readFileSync('src/games/lifespan/data/people.json', 'utf8'))
  const unmatched = []
  let enriched = 0

  for (const p of people) {
    let entity = null
    try {
      const ids = await searchQids(p.name)
      if (ids.length) {
        const entities = await getEntities(ids)
        const want = parseInt(p.birth.date.slice(0, 4), 10)
        let firstHuman = null
        for (const id of ids) {
          const e = entities[id]
          if (!e || !isHuman(e)) continue
          if (!firstHuman) firstHuman = e
          const by = birthYear(e)
          if (by === null || Math.abs(by - want) <= 1) { entity = e; break }
        }
        // Fall back to the top human result if no birth-year match (search by
        // exact name is reliable for these well-known figures).
        if (!entity) entity = firstHuman
      }
    } catch (err) {
      console.error(`  ! ${p.id}: ${err.message}`)
    }

    const merged = new Set(p.acceptedAnswers.map(normalize))
    merged.add(normalize(p.name))
    if (entity) {
      enriched++
      for (const n of collectNames(entity)) merged.add(normalize(n))
    } else {
      unmatched.push(p.id)
    }
    p.acceptedAnswers = [...merged].filter(Boolean).sort()
    await sleep(350)
  }

  writeFileSync('src/games/lifespan/data/people.json', JSON.stringify(people, null, 2) + '\n')
  const total = people.reduce((n, p) => n + p.acceptedAnswers.length, 0)
  console.log(`Enriched ${enriched}/${people.length} from Wikidata.`)
  console.log(`Unmatched (kept existing answers): ${unmatched.length} -> ${unmatched.join(', ') || 'none'}`)
  console.log(`Total accepted answers: ${total} (avg ${(total / people.length).toFixed(1)}/person)`)
  const mag = people.find((p) => /magellan/i.test(p.name))
  if (mag) console.log(`\nMagellan check:\n  ${mag.acceptedAnswers.join('\n  ')}`)
}

main().catch((e) => { console.error(e); process.exit(1) })

// Run with: node scripts/harvest-wikidata.mjs
// One-time data harvest, batched across fame bands. Review output before committing.
import { readFileSync, writeFileSync } from 'node:fs'

const ENDPOINT = 'https://query.wikidata.org/sparql'

// Bands ordered by descending fame; each fetches LIMIT 200 unique people.
// More bands = more coverage if we need them.
const BANDS = [
  { min: 200, max: null },
  { min: 150, max: 200 },
  { min: 130, max: 150 },
  { min: 115, max: 130 },
  { min: 100, max: 115 },
  { min: 90,  max: 100 },
  { min: 80,  max: 90  },
]
const TARGET = 150

// Use a subquery to get one row per person with a SAMPLE for optional fields.
// This avoids the cartesian explosion from multiple P106/P27 values.
const buildQuery = ({ min, max }) => {
  const bandFilter = max
    ? `FILTER(?sitelinks > ${min} && ?sitelinks <= ${max})`
    : `FILTER(?sitelinks > ${min})`
  return `
SELECT ?person ?personLabel
       (SAMPLE(?birthDate) AS ?birthDate) (SAMPLE(?deathDate) AS ?deathDate)
       (SAMPLE(?birthPlaceLabel) AS ?birthPlaceLabel)
       (SAMPLE(?bLat) AS ?bLat) (SAMPLE(?bLng) AS ?bLng)
       (SAMPLE(?deathPlaceLabel) AS ?deathPlaceLabel)
       (SAMPLE(?dLat) AS ?dLat) (SAMPLE(?dLng) AS ?dLng)
       (SAMPLE(?genderLabel) AS ?genderLabel)
       (SAMPLE(?occupationLabel) AS ?occupationLabel)
       (SAMPLE(?nationalityLabel) AS ?nationalityLabel)
       ?sitelinks WHERE {
  ?person wdt:P31 wd:Q5 ;
          wikibase:sitelinks ?sitelinks ;
          wdt:P569 ?birthDate ; wdt:P570 ?deathDate ;
          wdt:P19 ?birthPlace ; wdt:P20 ?deathPlace .
  ?birthPlace wdt:P625 ?bCoord . ?deathPlace wdt:P625 ?dCoord .
  BIND(geof:latitude(?bCoord) AS ?bLat) BIND(geof:longitude(?bCoord) AS ?bLng)
  BIND(geof:latitude(?dCoord) AS ?dLat) BIND(geof:longitude(?dCoord) AS ?dLng)
  OPTIONAL { ?person wdt:P21 ?gender. }
  OPTIONAL { ?person wdt:P106 ?occupation. }
  OPTIONAL { ?person wdt:P27 ?nationality. }
  ${bandFilter}
  FILTER(YEAR(?birthDate) >= 1400)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en".
    ?birthPlace rdfs:label ?birthPlaceLabel.
    ?deathPlace rdfs:label ?deathPlaceLabel.
    ?gender rdfs:label ?genderLabel.
    ?occupation rdfs:label ?occupationLabel.
    ?nationality rdfs:label ?nationalityLabel.
    ?person rdfs:label ?personLabel.
  }
}
GROUP BY ?person ?personLabel ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT 200
`
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function sanitizeDate(raw) {
  // raw like "1452-04-15T00:00:00Z"; guard month/day "00"
  let d = raw.slice(0, 10)
  let [y, m, day] = d.split('-')
  if (m === '00') m = '01'
  if (day === '00') day = '01'
  return `${y}-${m}-${day}`
}

function centuryLabel(birthISO, deathISO) {
  const by = parseInt(birthISO.slice(0, 4), 10)
  const dy = parseInt(deathISO.slice(0, 4), 10)
  const century = (yr) => Math.floor((Math.abs(yr) - 1) / 100) + 1
  const ord = (n) => {
    const v = n % 100
    const suffix = (v >= 11 && v <= 13) ? 'th' : (['th','st','nd','rd'][n % 10] || 'th')
    return `${n}${suffix} century`
  }
  const bc = century(by), dc = century(dy)
  return bc === dc ? ord(bc) : `${ord(bc)}–${ord(dc)}`
}

function slug(name) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function fetchBand(band) {
  const query = buildQuery(band)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(query)}&format=json`,
        { headers: { 'User-Agent': 'MetroWreckLabs/1.0 (harvest script)', 'Accept': 'application/sparql-results+json' } })
      if (res.status === 429 || res.status === 504) {
        console.warn(`  Got ${res.status}, retrying after 4s (attempt ${attempt + 1}/3)...`)
        await sleep(4000)
        continue
      }
      if (!res.ok) throw new Error(`Wikidata ${res.status}`)
      return (await res.json()).results.bindings
    } catch (e) {
      if (attempt === 2) {
        console.warn(`  Band failed after 3 attempts: ${e.message}`)
        return []
      }
      console.warn(`  Error on attempt ${attempt + 1}: ${e.message}, retrying...`)
      await sleep(4000)
    }
  }
  return []
}

async function main() {
  const byId = new Map()
  const bandResults = []

  for (const band of BANDS) {
    const label = band.max ? `${band.min}–${band.max}` : `>${band.min}`
    if (byId.size >= TARGET + 30) {
      console.log(`  Have ${byId.size} candidates, done.`)
      bandResults.push({ label, rows: 0, added: 0, skipped: true })
      continue
    }
    console.log(`Fetching band sitelinks ${label}...`)
    const rows = await fetchBand(band)
    console.log(`  Got ${rows.length} rows`)
    let added = 0
    for (const b of rows) {
      const name = b.personLabel?.value
      if (!name || /^Q\d+$/.test(name)) continue
      const id = slug(name)
      if (byId.has(id)) continue
      const birthDate = sanitizeDate(b.birthDate.value)
      const deathDate = sanitizeDate(b.deathDate.value)
      byId.set(id, {
        id, name,
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
        bio: '', acceptedAnswers: [name.toLowerCase()],
      })
      added++
    }
    bandResults.push({ label, rows: rows.length, added })
    console.log(`  Added ${added} new people (total candidates: ${byId.size})`)
    await sleep(1500)
  }

  // Load existing hand-verified entries (existing ids win).
  const existing = JSON.parse(readFileSync('src/data/people.json', 'utf8'))
  const existingIds = new Set(existing.map((p) => p.id))

  // Also block slug-alias duplicates of originals (match on normalized name).
  const existingNamesNorm = new Set(existing.map((p) => p.name.toLowerCase().trim()))

  const harvested = [...byId.values()].filter((p) =>
    !existingIds.has(p.id) && !existingNamesNorm.has(p.name.toLowerCase().trim())
  )

  const merged = [...existing, ...harvested].slice(0, TARGET)

  writeFileSync('src/data/people.json', JSON.stringify(merged, null, 2) + '\n')
  console.log(`\nBand summary:`)
  for (const r of bandResults) {
    const note = r.skipped ? '(skipped — enough candidates)' : `${r.rows} rows -> ${r.added} added`
    console.log(`  sitelinks ${r.label}: ${note}`)
  }
  console.log(`\nWrote ${merged.length} people total (${harvested.length} newly harvested).`)
  console.log('REVIEW before committing: spot-check dates, coords, and that names are recognizable.')
}

main().catch((e) => { console.error(e); process.exit(1) })

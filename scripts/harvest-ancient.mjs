// Harvest famous PRE-1400 figures (incl. BC: emperors, Caesar, Cleopatra,
// Alexander, Socrates, Pythagoras, ...) from Wikidata. Banded by fame to stay
// under the public endpoint's timeout. Writes candidates to a separate file.
//
// Run: node scripts/harvest-ancient.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const BANDS = [
  'FILTER(?sitelinks > 250)',
  'FILTER(?sitelinks > 160 && ?sitelinks <= 250)',
  'FILTER(?sitelinks > 110 && ?sitelinks <= 160)',
  'FILTER(?sitelinks > 75 && ?sitelinks <= 110)',
]

const buildQuery = (band) => `
SELECT ?person ?personLabel ?birthDate ?deathDate
       ?birthPlaceLabel ?bLat ?bLng ?deathPlaceLabel ?dLat ?dLng ?genderLabel ?sitelinks
       (SAMPLE(?occL) AS ?occupation) (SAMPLE(?natL) AS ?nationality)
WHERE {
  ?person wdt:P31 wd:Q5 ; wikibase:sitelinks ?sitelinks .
  ${band}
  ?person wdt:P569 ?birthDate ; wdt:P570 ?deathDate ;
          wdt:P19 ?birthPlace ; wdt:P20 ?deathPlace ;
          rdfs:label ?personLabel .
  FILTER(LANG(?personLabel) = "en")
  FILTER(YEAR(?birthDate) < 1400)
  ?birthPlace wdt:P625 ?bCoord ; rdfs:label ?birthPlaceLabel . FILTER(LANG(?birthPlaceLabel) = "en")
  ?deathPlace wdt:P625 ?dCoord ; rdfs:label ?deathPlaceLabel . FILTER(LANG(?deathPlaceLabel) = "en")
  BIND(geof:latitude(?bCoord) AS ?bLat) BIND(geof:longitude(?bCoord) AS ?bLng)
  BIND(geof:latitude(?dCoord) AS ?dLat) BIND(geof:longitude(?dCoord) AS ?dLng)
  OPTIONAL { ?person wdt:P21 ?gender. ?gender rdfs:label ?genderLabel. FILTER(LANG(?genderLabel)="en") }
  OPTIONAL { ?person wdt:P106 ?occ. ?occ rdfs:label ?occL. FILTER(LANG(?occL)="en") }
  OPTIONAL { ?person wdt:P27 ?nat. ?nat rdfs:label ?natL. FILTER(LANG(?natL)="en") }
}
GROUP BY ?person ?personLabel ?birthDate ?deathDate ?birthPlaceLabel ?bLat ?bLng ?deathPlaceLabel ?dLat ?dLng ?genderLabel ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT 250
`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function fetchBand(band) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(buildQuery(band))}&format=json`, {
        headers: { 'User-Agent': 'MetroWreckLabs/1.0 (ancient harvest)', Accept: 'application/sparql-results+json' },
      })
      if ([429, 502, 503, 504].includes(res.status)) { await sleep(4000 * (attempt + 1)); continue }
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return (await res.json()).results.bindings
    } catch (e) {
      if (attempt === 4) { console.error(`  band failed: ${e.message}`); return [] }
      await sleep(4000 * (attempt + 1))
    }
  }
  return []
}

function yearStr(t) {
  const m = /^(-?)(\d+)-/.exec(t)
  if (!m) return null
  return (m[1] === '-' ? '-' : '') + m[2].padStart(4, '0')
}

function centuryLabel(yStr) {
  const y = parseInt(yStr, 10)
  const c = Math.floor((Math.abs(y) - 1) / 100) + 1
  const v = c % 100
  const suffix = v >= 11 && v <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][c % 10] || 'th'
  return y < 0 ? `${c}${suffix} century BC` : `${c}${suffix} century`
}

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : 'Unknown')
const slug = (name) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

async function main() {
  const existing = JSON.parse(readFileSync('src/data/people.json', 'utf8'))
  const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  const existingIds = new Set(existing.map((p) => p.id))
  const existingNames = new Set(existing.map((p) => norm(p.name)))

  const byId = new Map()
  for (const band of BANDS) {
    const rows = await fetchBand(band)
    console.log(`band ${band}: ${rows.length} rows`)
    for (const b of rows) {
      const name = b.personLabel?.value
      if (!name || /^Q\d+$/.test(name)) continue
      const id = slug(name)
      if (existingIds.has(id) || existingNames.has(norm(name)) || byId.has(id)) continue
      const birth = yearStr(b.birthDate.value)
      const death = yearStr(b.deathDate.value)
      if (!birth || !death) continue
      byId.set(id, {
        id, name,
        birth: { date: birth, place: b.birthPlaceLabel.value, lat: +(+b.bLat.value).toFixed(2), lng: +(+b.bLng.value).toFixed(2) },
        death: { date: death, place: b.deathPlaceLabel.value, lat: +(+b.dLat.value).toFixed(2), lng: +(+b.dLng.value).toFixed(2) },
        hints: {
          century: centuryLabel(birth),
          gender: b.genderLabel?.value ?? 'Unknown',
          nationality: cap(b.nationality?.value),
          profession: cap(b.occupation?.value),
        },
        bio: '', acceptedAnswers: [name.toLowerCase()],
      })
    }
    await sleep(1500)
  }

  const candidates = [...byId.values()]
  writeFileSync('scripts/ancient-candidates.json', JSON.stringify(candidates, null, 2) + '\n')
  console.log(`\nAncient candidates (pre-1400, new): ${candidates.length}`)
  candidates.slice(0, 40).forEach((p) =>
    console.log(`  ${p.name} | ${p.hints.profession} | ${p.birth.date} ${p.birth.place} -> ${p.death.date} ${p.death.place}`),
  )
}

main().catch((e) => { console.error(e); process.exit(1) })

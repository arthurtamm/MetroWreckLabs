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
  FILTER(?sitelinks > 120)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
}
ORDER BY DESC(?sitelinks)
LIMIT 250
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

// Run with: node scripts/harvest-wikidata.mjs
// One-time batched Wikidata harvest. Review output before committing.
import { readFileSync, writeFileSync } from 'node:fs'

const ENDPOINT = 'https://query.wikidata.org/sparql'
const BANDS = [
  'FILTER(?sitelinks > 200)',
  'FILTER(?sitelinks > 150 && ?sitelinks <= 200)',
  'FILTER(?sitelinks > 120 && ?sitelinks <= 150)',
  'FILTER(?sitelinks > 100 && ?sitelinks <= 120)',
]
const TARGET = 150

// Headline occupations in rough priority order (specific before generic).
const PRIORITY = [
  'painter','sculptor','architect','composer','physicist','chemist','mathematician',
  'astronomer','biologist','inventor','engineer','economist','philosopher','theologian',
  'poet','novelist','playwright','journalist','historian','physician','psychologist',
  'emperor','empress','king','queen','monarch','pharaoh','president','prime minister',
  'statesperson','politician','diplomat','military officer','general','admiral','revolutionary',
  'explorer','footballer','basketball player','tennis player','boxer','racing driver','chess player',
  'singer','musician','conductor','film director','actor','filmmaker','photographer','designer',
  'astronaut','aviator','businessperson','lawyer','jurist','nurse','activist','writer','artist',
]

const buildQuery = (bandFilter) => `
SELECT ?person ?personLabel ?birthDate ?deathDate
       ?birthPlaceLabel ?bLat ?bLng ?deathPlaceLabel ?dLat ?dLng ?genderLabel ?sitelinks
       (GROUP_CONCAT(DISTINCT ?occLabel; separator="|") AS ?occupations)
       (GROUP_CONCAT(DISTINCT ?natLabel; separator="|") AS ?nationalities)
WHERE {
  ?person wdt:P31 wd:Q5 ;
          wikibase:sitelinks ?sitelinks ;
          wdt:P569 ?birthDate ; wdt:P570 ?deathDate ;
          wdt:P19 ?birthPlace ; wdt:P20 ?deathPlace ;
          rdfs:label ?personLabel .
  FILTER(LANG(?personLabel) = "en")
  ?birthPlace wdt:P625 ?bCoord ; rdfs:label ?birthPlaceLabel .
  FILTER(LANG(?birthPlaceLabel) = "en")
  ?deathPlace wdt:P625 ?dCoord ; rdfs:label ?deathPlaceLabel .
  FILTER(LANG(?deathPlaceLabel) = "en")
  BIND(geof:latitude(?bCoord) AS ?bLat) BIND(geof:longitude(?bCoord) AS ?bLng)
  BIND(geof:latitude(?dCoord) AS ?dLat) BIND(geof:longitude(?dCoord) AS ?dLng)
  OPTIONAL { ?person wdt:P21 ?gender. ?gender rdfs:label ?genderLabel. FILTER(LANG(?genderLabel)="en") }
  OPTIONAL { ?person wdt:P106 ?occ. ?occ rdfs:label ?occLabel. FILTER(LANG(?occLabel)="en") }
  OPTIONAL { ?person wdt:P27 ?nat. ?nat rdfs:label ?natLabel. FILTER(LANG(?natLabel)="en") }
  ${bandFilter}
  FILTER(YEAR(?birthDate) >= 1400)
}
GROUP BY ?person ?personLabel ?birthDate ?deathDate ?birthPlaceLabel ?bLat ?bLng ?deathPlaceLabel ?dLat ?dLng ?genderLabel ?sitelinks
ORDER BY DESC(?sitelinks)
LIMIT 200
`

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

function pickProfession(occCsv) {
  const occs = (occCsv || '').split('|').map((s) => s.trim()).filter(Boolean)
  if (occs.length === 0) return 'Unknown'
  const lower = occs.map((o) => o.toLowerCase())
  // Exact-match pass first, then substring pass — prevents "stage painter" winning over "painter"
  for (const p of PRIORITY) {
    const idx = lower.findIndex((o) => o === p)
    if (idx !== -1) return occs[idx].charAt(0).toUpperCase() + occs[idx].slice(1)
  }
  for (const p of PRIORITY) {
    const idx = lower.findIndex((o) => o.includes(p))
    if (idx !== -1) return occs[idx].charAt(0).toUpperCase() + occs[idx].slice(1)
  }
  return occs[0].charAt(0).toUpperCase() + occs[0].slice(1)
}

function firstOf(csv) {
  const v = (csv || '').split('|').map((s) => s.trim()).filter(Boolean)
  return v[0] || 'Unknown'
}

function sanitizeDate(raw) {
  let [y, m, d] = raw.slice(0, 10).split('-')
  if (m === '00') m = '01'
  if (d === '00') d = '01'
  return `${y}-${m}-${d}`
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

async function fetchBand(bandFilter) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(`${ENDPOINT}?query=${encodeURIComponent(buildQuery(bandFilter))}&format=json`,
        { headers: { 'User-Agent': 'MetroWreckLabs/1.0 (harvest script)', 'Accept': 'application/sparql-results+json' } })
      if (res.status === 429 || res.status === 504) { await sleep(3000); continue }
      if (!res.ok) throw new Error(`Wikidata ${res.status}`)
      return (await res.json()).results.bindings
    } catch (e) {
      if (attempt === 2) throw e
      await sleep(3000)
    }
  }
  return []
}

async function main() {
  const byId = new Map()
  for (const band of BANDS) {
    if (byId.size >= TARGET + 60) break
    const rows = await fetchBand(band)
    console.log(`band ${band}: ${rows.length} rows`)
    for (const b of rows) {
      const name = b.personLabel?.value
      if (!name || /^Q\d+$/.test(name)) continue
      const id = slug(name)
      if (byId.has(id)) continue
      const birthDate = sanitizeDate(b.birthDate.value)
      const deathDate = sanitizeDate(b.deathDate.value)
      byId.set(id, {
        id, name,
        birth: { date: birthDate, place: b.birthPlaceLabel?.value ?? 'Unknown', lat: +(+b.bLat.value).toFixed(2), lng: +(+b.bLng.value).toFixed(2) },
        death: { date: deathDate, place: b.deathPlaceLabel?.value ?? 'Unknown', lat: +(+b.dLat.value).toFixed(2), lng: +(+b.dLng.value).toFixed(2) },
        hints: {
          century: centuryLabel(birthDate, deathDate),
          gender: b.genderLabel?.value ?? 'Unknown',
          nationality: firstOf(b.nationalities?.value),
          profession: pickProfession(b.occupations?.value),
        },
        bio: '', acceptedAnswers: [name.toLowerCase()],
      })
    }
    await sleep(1000)
  }

  const existing = JSON.parse(readFileSync('src/data/people.json', 'utf8'))
  const original = existing.slice(0, 8) // the 8 hand-verified originals
  const originalIds = new Set(original.map((p) => p.id))
  const harvested = [...byId.values()].filter((p) => !originalIds.has(p.id))
  const merged = [...original, ...harvested].slice(0, TARGET)
  writeFileSync('src/data/people.json', JSON.stringify(merged, null, 2) + '\n')
  console.log(`Wrote ${merged.length} people (${harvested.length} harvested).`)
}

main().catch((e) => { console.error(e); process.exit(1) })

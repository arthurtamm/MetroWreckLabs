// Tag each person's birth/death point with a country via point-in-polygon
// against the bundled Natural Earth country borders. No API, no subagent —
// the country is derived deterministically from the coordinates.
//
// Run: node scripts/add-countries.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const people = JSON.parse(readFileSync('src/data/people.json', 'utf8'))
const countries = JSON.parse(readFileSync('src/data/countries.json', 'utf8'))

// Ray-casting point-in-ring (even-odd). Coordinates are [lng, lat].
function pointInRing(x, y, ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1]
    const xj = ring[j][0], yj = ring[j][1]
    const hit = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi
    if (hit) inside = !inside
  }
  return inside
}

// A polygon is [outerRing, ...holes]; even-odd across rings handles holes.
function pointInPolygon(x, y, polygon) {
  let inside = false
  for (const ring of polygon) if (pointInRing(x, y, ring)) inside = !inside
  return inside
}

function pointInGeometry(x, y, geom) {
  if (geom.type === 'Polygon') return pointInPolygon(x, y, geom.coordinates)
  if (geom.type === 'MultiPolygon') {
    let inside = false
    for (const poly of geom.coordinates) if (pointInPolygon(x, y, poly)) inside = !inside
    return inside
  }
  return false
}

function countryAt(lng, lat) {
  for (const f of countries.features) {
    if (pointInGeometry(lng, lat, f.geometry)) return f.properties.ADMIN
  }
  return null
}

const unresolved = []
for (const p of people) {
  p.birth.country = countryAt(p.birth.lng, p.birth.lat)
  p.death.country = countryAt(p.death.lng, p.death.lat)
  if (!p.birth.country) unresolved.push(`${p.id} BIRTH (${p.birth.lat},${p.birth.lng}) "${p.birth.place}"`)
  if (!p.death.country) unresolved.push(`${p.id} DEATH (${p.death.lat},${p.death.lng}) "${p.death.place}"`)
}

writeFileSync('src/data/people.json', JSON.stringify(people, null, 2) + '\n')

const sameCountry = people.filter(
  (p) => p.birth.country && p.death.country && p.birth.country === p.death.country,
)
console.log(`Tagged ${people.length} people.`)
console.log(`Unresolved points (no country polygon matched): ${unresolved.length}`)
unresolved.forEach((u) => console.log('  - ' + u))
console.log(`\nBorn & died in the SAME country: ${sameCountry.length}`)
console.log(`  -> would remain after removing them: ${people.length - sameCountry.length}`)
console.log('Same-country sample:', sameCountry.slice(0, 12).map((p) => `${p.name} (${p.birth.country})`).join(', '))

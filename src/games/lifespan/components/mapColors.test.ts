import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath, URL as NodeURL } from 'node:url'
import { MAP_COLORS } from './MapView'

// Leaflet takes colors as plain JS options and cannot read CSS custom
// properties, so MAP_COLORS necessarily duplicates --land/--coast/--born/
// --died from tokens.css by hand. That duplication has already drifted once
// (the land/coast values were darkened and both files had to be edited),
// and --land/--coast aren't referenced by any CSS rule, so nothing else
// would catch a future drift. This test is the sync check: it parses the
// tokens straight out of tokens.css and compares them to MAP_COLORS, so it
// fails the moment the two disagree rather than quietly rendering a map
// that no longer matches the design tokens.
//
// jsdom's global `URL` isn't a real Node URL and fileURLToPath rejects it,
// so the Node constructor is imported explicitly rather than using the
// ambient global.
const tokensPath = fileURLToPath(new NodeURL('../../../styles/tokens.css', import.meta.url))
const tokensCss = readFileSync(tokensPath, 'utf8')

function tokenValue(name: string): string {
  const match = tokensCss.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{3,8})\\s*;`))
  if (!match) throw new Error(`--${name} not found in tokens.css`)
  return match[1]
}

describe('MAP_COLORS stays in sync with tokens.css', () => {
  it('matches --land', () => {
    expect(MAP_COLORS.land).toBe(tokenValue('land'))
  })

  it('matches --coast', () => {
    expect(MAP_COLORS.coast).toBe(tokenValue('coast'))
  })

  it('matches --born', () => {
    expect(MAP_COLORS.born).toBe(tokenValue('born'))
  })

  it('matches --died', () => {
    expect(MAP_COLORS.died).toBe(tokenValue('died'))
  })
})

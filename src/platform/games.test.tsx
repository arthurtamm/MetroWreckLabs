import { describe, it, expect } from 'vitest'
import { GAMES, findGame, type GameMeta } from './games'

describe('GAMES registry', () => {
  // Several tests below assert inside a loop over GAMES; without this they
  // would pass vacuously on an empty registry.
  it('is not empty', () => {
    expect(GAMES.length).toBeGreaterThan(0)
  })

  it('has unique ids', () => {
    const ids = GAMES.map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('has URL-safe ids', () => {
    for (const g of GAMES) expect(g.id).toMatch(/^[a-z0-9-]+$/)
  })

  it('gives every live game a loader', () => {
    for (const g of GAMES) {
      if (g.status === 'live') expect(typeof g.load).toBe('function')
    }
  })

  it('gives every game exactly four tile colors', () => {
    for (const g of GAMES) expect(g.tiles).toHaveLength(4)
  })

  it('gives every game display copy', () => {
    for (const g of GAMES) {
      expect(g.name.length).toBeGreaterThan(0)
      expect(g.tagline.length).toBeGreaterThan(0)
      expect(g.howToPlay).toBeTruthy()
    }
  })

  it('includes lifespan as a live game', () => {
    const lifespan = findGame(GAMES, 'lifespan')
    expect(lifespan?.name).toBe('Lifespan')
    expect(lifespan?.status).toBe('live')
  })
})

describe('findGame', () => {
  const games: GameMeta[] = [
    {
      id: 'alpha', name: 'Alpha', tagline: 'First', status: 'soon',
      tiles: ['born', 'border', 'border', 'died'], howToPlay: <p>rules</p>,
    },
  ]

  it('finds a game by id', () => {
    expect(findGame(games, 'alpha')?.name).toBe('Alpha')
  })

  it('returns undefined for an unknown id', () => {
    expect(findGame(games, 'nope')).toBeUndefined()
  })
})

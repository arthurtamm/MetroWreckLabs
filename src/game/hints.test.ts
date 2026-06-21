import { describe, it, expect } from 'vitest'
import { deriveInitials, revealedHints } from './hints'
import type { Person } from '../data/types'

const mozart = {
  name: 'Wolfgang Amadeus Mozart',
  hints: { century: '18th century', gender: 'Male', nationality: 'Austrian', profession: 'Composer' },
} as Person

describe('deriveInitials', () => {
  it('takes first letter of each word, uppercase, dotted', () => {
    expect(deriveInitials('Wolfgang Amadeus Mozart')).toBe('W. A. M.')
  })
  it('uses the common name (Marie Curie → M. C.)', () => {
    expect(deriveInitials('Marie Curie')).toBe('M. C.')
  })
})

describe('revealedHints', () => {
  it('reveals nothing with zero wrong guesses', () => {
    expect(revealedHints(mozart, 0)).toEqual([])
  })
  it('reveals gender + nationality after 1 wrong guess', () => {
    expect(revealedHints(mozart, 1)).toEqual([
      { label: 'Gender & nationality', value: 'Male, Austrian' },
    ])
  })
  it('reveals in order, accumulating', () => {
    expect(revealedHints(mozart, 2)).toEqual([
      { label: 'Gender & nationality', value: 'Male, Austrian' },
      { label: 'Profession', value: 'Composer' },
    ])
  })
  it('reveals initials as the 3rd hint', () => {
    const all = revealedHints(mozart, 3)
    expect(all[2]).toEqual({ label: 'Initials', value: 'W. A. M.' })
  })
  it('caps at the number of available hints (3)', () => {
    expect(revealedHints(mozart, 99).length).toBe(3)
  })
})

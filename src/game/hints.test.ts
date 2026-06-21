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
})

describe('revealedHints', () => {
  it('reveals nothing with zero wrong guesses', () => {
    expect(revealedHints(mozart, 0)).toEqual([])
  })
  it('reveals century after 1 wrong guess', () => {
    expect(revealedHints(mozart, 1)).toEqual([{ label: 'Century', value: '18th century' }])
  })
  it('reveals in order, accumulating', () => {
    expect(revealedHints(mozart, 3)).toEqual([
      { label: 'Century', value: '18th century' },
      { label: 'Gender', value: 'Male' },
      { label: 'Nationality', value: 'Austrian' },
    ])
  })
  it('reveals initials as the 5th hint', () => {
    const all = revealedHints(mozart, 5)
    expect(all[4]).toEqual({ label: 'Initials', value: 'W. A. M.' })
  })
  it('caps at the number of available hints', () => {
    expect(revealedHints(mozart, 99).length).toBe(5)
  })
})

import { describe, it, expect } from 'vitest'
import { normalizeName, levenshtein, isCorrectGuess, findPerson } from './match'
import type { Person } from '../data/types'

const mozart = {
  id: 'mozart',
  name: 'Wolfgang Amadeus Mozart',
  acceptedAnswers: ['mozart', 'wolfgang amadeus mozart'],
} as Person

const curie = {
  id: 'curie',
  name: 'Marie Curie',
  acceptedAnswers: ['marie sklodowska curie'],
} as Person

const napoleon = {
  id: 'napoleon',
  name: 'Napoleon Bonaparte',
  acceptedAnswers: ['napoleon', 'napoleon bonaparte'],
} as Person

describe('normalizeName', () => {
  it('lowercases and trims', () => {
    expect(normalizeName('  Mozart ')).toBe('mozart')
  })
  it('strips diacritics', () => {
    expect(normalizeName('Frida Kahlo Coyoacán')).toBe('frida kahlo coyoacan')
  })
  it('collapses internal whitespace', () => {
    expect(normalizeName('wolfgang   amadeus  mozart')).toBe('wolfgang amadeus mozart')
  })
})

describe('levenshtein', () => {
  it('counts single-edit differences', () => {
    expect(levenshtein('tolstoy', 'tolstoi')).toBe(1)
    expect(levenshtein('napoleon', 'napolean')).toBe(1)
  })
  it('is zero for identical strings', () => {
    expect(levenshtein('mozart', 'mozart')).toBe(0)
  })
})

describe('isCorrectGuess', () => {
  it('matches an accepted answer case-insensitively', () => {
    expect(isCorrectGuess('  MOZART ', mozart)).toBe(true)
    expect(isCorrectGuess('Wolfgang Amadeus Mozart', mozart)).toBe(true)
  })
  it('always accepts the displayed name', () => {
    expect(isCorrectGuess('Marie Curie', curie)).toBe(true)
  })
  it('tolerates a small typo in a long name', () => {
    expect(isCorrectGuess('Napolean Bonaparte', napoleon)).toBe(true) // 1 edit
    expect(isCorrectGuess('Wolfgang Amadeus Mozar', mozart)).toBe(true) // 1 edit
  })
  it('rejects a wrong name', () => {
    expect(isCorrectGuess('Beethoven', mozart)).toBe(false)
  })
  it('does not fuzzy-match short names (too risky)', () => {
    const ali = { name: 'Ali', acceptedAnswers: ['ali'] } as Person
    expect(isCorrectGuess('Eli', ali)).toBe(false)
  })
})

describe('findPerson', () => {
  const people = [mozart, curie, napoleon]
  it('resolves a guess to the matching person', () => {
    expect(findPerson('Marie Curie', people)).toBe(curie)
    expect(findPerson('mozart', people)).toBe(mozart)
  })
  it('resolves a typo to the right person', () => {
    expect(findPerson('Napolean Bonaparte', people)).toBe(napoleon)
  })
  it('prefers an exact match over a fuzzy one', () => {
    const monroe = { id: 'monroe', name: 'Monroe', acceptedAnswers: ['monroe'] } as Person
    const munroe = { id: 'munroe', name: 'Munroe', acceptedAnswers: ['munroe'] } as Person
    expect(findPerson('Munroe', [monroe, munroe])).toBe(munroe)
  })
  it('returns null when no person matches', () => {
    expect(findPerson('Some Nobody', people)).toBeNull()
  })
})

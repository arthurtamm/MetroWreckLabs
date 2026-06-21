import { describe, it, expect } from 'vitest'
import { normalizeName, isCorrectGuess, findPerson } from './match'
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

describe('isCorrectGuess', () => {
  it('matches an accepted answer case-insensitively', () => {
    expect(isCorrectGuess('  MOZART ', mozart)).toBe(true)
    expect(isCorrectGuess('Wolfgang Amadeus Mozart', mozart)).toBe(true)
  })
  it('always accepts the displayed name (what autocomplete suggests)', () => {
    expect(isCorrectGuess('Marie Curie', curie)).toBe(true)
  })
  it('rejects a wrong name', () => {
    expect(isCorrectGuess('Beethoven', mozart)).toBe(false)
  })
})

describe('findPerson', () => {
  const people = [mozart, curie]
  it('resolves a guess to the matching person', () => {
    expect(findPerson('Marie Curie', people)).toBe(curie)
    expect(findPerson('mozart', people)).toBe(mozart)
  })
  it('returns null when no person matches', () => {
    expect(findPerson('Some Nobody', people)).toBeNull()
  })
})

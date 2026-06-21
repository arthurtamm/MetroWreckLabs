import { describe, it, expect } from 'vitest'
import { normalizeName, isCorrectGuess } from './match'
import type { Person } from '../data/types'

const mozart = {
  id: 'mozart',
  acceptedAnswers: ['mozart', 'wolfgang amadeus mozart'],
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
  it('rejects a wrong name', () => {
    expect(isCorrectGuess('Beethoven', mozart)).toBe(false)
  })
})

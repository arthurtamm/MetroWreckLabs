import type { Person } from '../data/types'

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

export function isCorrectGuess(guess: string, person: Person): boolean {
  const g = normalizeName(guess)
  return person.acceptedAnswers.some((a) => normalizeName(a) === g)
}

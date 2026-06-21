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
  // The displayed name (what autocomplete suggests) always counts, plus any
  // explicit accepted aliases.
  if (normalizeName(person.name) === g) return true
  return person.acceptedAnswers.some((a) => normalizeName(a) === g)
}

/**
 * Resolve a typed guess to a person in the dataset, or null if it matches none.
 * Used to reject guesses that aren't real people in the game.
 */
export function findPerson(guess: string, people: Person[]): Person | null {
  return people.find((p) => isCorrectGuess(guess, p)) ?? null
}

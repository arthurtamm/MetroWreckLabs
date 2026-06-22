import type { Person } from '../data/types'

export function normalizeName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/** Levenshtein edit distance between two strings. */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  if (a.length === 0) return b.length
  if (b.length === 0) return a.length
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    const cur = [i]
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost)
    }
    prev = cur
  }
  return prev[b.length]
}

/** Allowed typo distance scales with length; short names must be exact. */
function allowedDistance(len: number): number {
  if (len <= 4) return 0
  if (len <= 8) return 1
  return 2
}

/** Equal after normalization, tolerating a few typos for longer names. */
function fuzzyEqual(a: string, b: string): boolean {
  if (a === b) return true
  const allowed = allowedDistance(Math.max(a.length, b.length))
  if (allowed === 0) return false
  if (Math.abs(a.length - b.length) > allowed) return false // cheap prune
  return levenshtein(a, b) <= allowed
}

/** Every accepted spelling for a person, normalized (display name + aliases). */
function aliasesOf(person: Person): string[] {
  return [person.name, ...person.acceptedAnswers].map(normalizeName)
}

export function isCorrectGuess(guess: string, person: Person): boolean {
  const g = normalizeName(guess)
  return aliasesOf(person).some((a) => fuzzyEqual(g, a))
}

/**
 * Resolve a typed guess to a person, or null if none match. Exact alias matches
 * win before any fuzzy match, so a typo can never shadow someone's real name.
 */
export function findPerson(guess: string, people: Person[]): Person | null {
  const g = normalizeName(guess)
  const exact = people.find((p) => aliasesOf(p).includes(g))
  if (exact) return exact
  return people.find((p) => aliasesOf(p).some((a) => fuzzyEqual(g, a))) ?? null
}

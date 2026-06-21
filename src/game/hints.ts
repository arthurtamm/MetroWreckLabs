import type { Person } from '../data/types'
import { HINT_ORDER } from './constants'

export interface RevealedHint {
  label: string
  value: string
}

export function deriveInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + '.')
    .join(' ')
}

const LABELS: Record<string, string> = {
  century: 'Century',
  gender: 'Gender',
  nationality: 'Nationality',
  profession: 'Profession',
  initials: 'Initials',
}

/** All hints unlocked given a number of wrong guesses, in reveal order. */
export function revealedHints(person: Person, wrongGuesses: number): RevealedHint[] {
  const count = Math.min(wrongGuesses, HINT_ORDER.length)
  return HINT_ORDER.slice(0, count).map((key) => {
    const value =
      key === 'initials' ? deriveInitials(person.name) : person.hints[key]
    return { label: LABELS[key], value }
  })
}

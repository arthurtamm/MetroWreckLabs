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

/** All hints unlocked given a number of wrong guesses, in reveal order. */
export function revealedHints(person: Person, wrongGuesses: number): RevealedHint[] {
  const count = Math.min(wrongGuesses, HINT_ORDER.length)
  return HINT_ORDER.slice(0, count).map((key): RevealedHint => {
    switch (key) {
      case 'origin':
        return {
          label: 'Gender & nationality',
          value: `${person.hints.gender}, ${person.hints.nationality}`,
        }
      case 'profession':
        return { label: 'Profession', value: person.hints.profession }
      case 'initials':
        return { label: 'Initials', value: deriveInitials(person.name) }
    }
  })
}

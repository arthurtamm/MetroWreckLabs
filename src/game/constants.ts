import type { PersonHints } from '../data/types'

/** Launch date — daily puzzle #1. Local-date based. */
export const EPOCH = '2026-06-21'

export const MAX_GUESSES = 6

/** Order hints are revealed after each wrong guess: least → most helpful. */
export const HINT_ORDER: (keyof PersonHints | 'initials')[] = [
  'century',
  'gender',
  'nationality',
  'profession',
  'initials',
]

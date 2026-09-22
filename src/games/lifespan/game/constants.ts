/** Launch date — daily puzzle #1. Local-date based. */
export const EPOCH = '2026-06-21'

export const MAX_GUESSES = 6

/**
 * Order hints are revealed after each wrong guess: least → most helpful.
 * 'origin' combines gender + nationality. Century is intentionally omitted —
 * the birth/death dates are already visible, so it adds nothing.
 */
export const HINT_ORDER = ['origin', 'profession', 'initials'] as const

export type HintKey = (typeof HINT_ORDER)[number]

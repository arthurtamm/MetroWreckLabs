import type { Person } from '../data/types'
import { MAX_GUESSES } from './constants'

export interface GuessRecord {
  id: string
  name: string
  correct: boolean
}

export type GameStatus = 'playing' | 'won' | 'lost'

export interface GameState {
  person: Person
  guesses: GuessRecord[]
  status: GameStatus
}

export type GameAction =
  | { type: 'guess'; id: string; name: string; correct: boolean }
  | { type: 'reset'; person: Person }

export function initGame(person: Person): GameState {
  return { person, guesses: [], status: 'playing' }
}

export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'reset':
      return initGame(action.person)
    case 'guess': {
      if (state.status !== 'playing') return state
      // Ignore a person already guessed — don't consume a guess.
      if (state.guesses.some((g) => g.id === action.id)) return state
      const guesses = [
        ...state.guesses,
        { id: action.id, name: action.name, correct: action.correct },
      ]
      let status: GameStatus = 'playing'
      if (action.correct) status = 'won'
      else if (guesses.length >= MAX_GUESSES) status = 'lost'
      return { ...state, guesses, status }
    }
    default:
      return state
  }
}

/** Count of wrong guesses so far (drives hint reveal). */
export function wrongCount(state: GameState): number {
  return state.guesses.filter((g) => !g.correct).length
}

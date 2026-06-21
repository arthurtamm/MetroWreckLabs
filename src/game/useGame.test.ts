import { describe, it, expect } from 'vitest'
import { gameReducer, initGame } from './useGame'
import type { Person } from '../data/types'

const mozart = {
  id: 'mozart',
  name: 'Wolfgang Amadeus Mozart',
  acceptedAnswers: ['mozart'],
} as Person

describe('gameReducer', () => {
  it('starts in playing status with no guesses', () => {
    const s = initGame(mozart)
    expect(s.status).toBe('playing')
    expect(s.guesses).toEqual([])
  })

  it('records a wrong guess and stays playing', () => {
    let s = initGame(mozart)
    s = gameReducer(s, { type: 'guess', name: 'Beethoven' })
    expect(s.guesses).toEqual([{ name: 'Beethoven', correct: false }])
    expect(s.status).toBe('playing')
  })

  it('wins on a correct guess', () => {
    let s = initGame(mozart)
    s = gameReducer(s, { type: 'guess', name: 'Mozart' })
    expect(s.status).toBe('won')
    expect(s.guesses.length).toBe(1)
  })

  it('loses after MAX_GUESSES wrong guesses', () => {
    let s = initGame(mozart)
    for (let i = 0; i < 6; i++) s = gameReducer(s, { type: 'guess', name: `wrong${i}` })
    expect(s.status).toBe('lost')
  })

  it('ignores guesses once the round is over', () => {
    let s = initGame(mozart)
    s = gameReducer(s, { type: 'guess', name: 'Mozart' }) // win
    s = gameReducer(s, { type: 'guess', name: 'Beethoven' })
    expect(s.guesses.length).toBe(1)
  })
})

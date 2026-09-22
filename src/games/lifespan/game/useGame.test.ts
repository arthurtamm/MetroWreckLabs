import { describe, it, expect } from 'vitest'
import { gameReducer, initGame } from './useGame'
import type { Person } from '../data/types'

const mozart = {
  id: 'mozart',
  name: 'Wolfgang Amadeus Mozart',
  acceptedAnswers: ['mozart'],
} as Person

const wrong = (id: string) => ({ type: 'guess' as const, id, name: id, correct: false })
const right = (id: string) => ({ type: 'guess' as const, id, name: id, correct: true })

describe('gameReducer', () => {
  it('starts in playing status with no guesses', () => {
    const s = initGame(mozart)
    expect(s.status).toBe('playing')
    expect(s.guesses).toEqual([])
  })

  it('records a wrong guess and stays playing', () => {
    let s = initGame(mozart)
    s = gameReducer(s, { type: 'guess', id: 'beethoven', name: 'Beethoven', correct: false })
    expect(s.guesses).toEqual([{ id: 'beethoven', name: 'Beethoven', correct: false }])
    expect(s.status).toBe('playing')
  })

  it('wins on a correct guess', () => {
    let s = initGame(mozart)
    s = gameReducer(s, right('mozart'))
    expect(s.status).toBe('won')
    expect(s.guesses.length).toBe(1)
  })

  it('loses after MAX_GUESSES wrong guesses', () => {
    let s = initGame(mozart)
    for (let i = 0; i < 6; i++) s = gameReducer(s, wrong(`wrong${i}`))
    expect(s.status).toBe('lost')
  })

  it('ignores a duplicate guess (same person) without consuming a guess', () => {
    let s = initGame(mozart)
    s = gameReducer(s, wrong('beethoven'))
    s = gameReducer(s, wrong('beethoven'))
    expect(s.guesses.length).toBe(1)
    expect(s.status).toBe('playing')
  })

  it('ignores guesses once the round is over', () => {
    let s = initGame(mozart)
    s = gameReducer(s, right('mozart')) // win
    s = gameReducer(s, wrong('beethoven'))
    expect(s.guesses.length).toBe(1)
  })
})

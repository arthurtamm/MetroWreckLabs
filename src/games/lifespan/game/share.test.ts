import { describe, it, expect } from 'vitest'
import { buildShareText } from './share'

describe('buildShareText', () => {
  it('formats a win with red squares then green', () => {
    expect(buildShareText({ puzzleNumber: 142, won: true, guessCount: 3, maxGuesses: 6 }))
      .toBe('MetroWreckLabs #142\n🟥🟥🟩 (3/6)\n🌍 born → 💀 died')
  })
  it('formats a first-try win', () => {
    expect(buildShareText({ puzzleNumber: 1, won: true, guessCount: 1, maxGuesses: 6 }))
      .toBe('MetroWreckLabs #1\n🟩 (1/6)\n🌍 born → 💀 died')
  })
  it('formats a loss with all red and X/6', () => {
    expect(buildShareText({ puzzleNumber: 5, won: false, guessCount: 6, maxGuesses: 6 }))
      .toBe('MetroWreckLabs #5\n🟥🟥🟥🟥🟥🟥 (X/6)\n🌍 born → 💀 died')
  })
})

export interface ShareInput {
  puzzleNumber: number
  won: boolean
  guessCount: number  // number of guesses used (the winning guess counts)
  maxGuesses: number
}

export function buildShareText({ puzzleNumber, won, guessCount, maxGuesses }: ShareInput): string {
  const wrong = won ? guessCount - 1 : guessCount
  const grid = '🟥'.repeat(wrong) + (won ? '🟩' : '')
  const score = won ? `${guessCount}/${maxGuesses}` : `X/${maxGuesses}`
  return `MetroWreckLabs #${puzzleNumber}\n${grid} (${score})\n🌍 born → 💀 died`
}

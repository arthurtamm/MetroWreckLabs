import type { Person } from '../data/types'

interface Props {
  person: Person
  won: boolean
  shareText: string
  onPlayAgain: (() => void) | null
}

export function ResultScreen({ person, won, shareText, onPlayAgain }: Props) {
  async function share() {
    try {
      await navigator.clipboard.writeText(shareText)
    } catch {
      // clipboard unavailable — no-op for v1
    }
  }

  return (
    <div className="result-screen">
      <h2>{won ? '🎉 Solved!' : '💀 Out of guesses'}</h2>
      <p className="answer">
        {won ? 'It was ' : 'It was '}<strong>{person.name}</strong>
      </p>
      {person.bio && <p className="bio">{person.bio}</p>}
      <pre className="share-preview">{shareText}</pre>
      <div className="result-actions">
        <button onClick={share}>Share result</button>
        {onPlayAgain && <button onClick={onPlayAgain}>Play again</button>}
      </div>
    </div>
  )
}

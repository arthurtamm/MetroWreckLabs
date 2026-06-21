import type { RevealedHint } from '../game/hints'
import { MAX_GUESSES } from '../game/constants'

interface Props {
  hints: RevealedHint[]
  guessesLeft: number
}

export function HintPanel({ hints, guessesLeft }: Props) {
  return (
    <div className="hint-panel">
      <div className="guesses-left">{guessesLeft} of {MAX_GUESSES} guesses left</div>
      {hints.length === 0 ? (
        <p className="hint-empty">No hints yet — guess from the map, or a wrong guess unlocks a clue.</p>
      ) : (
        <ul className="hints">
          {hints.map((h) => (
            <li key={h.label}><span className="hint-label">{h.label}:</span> {h.value}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

import type { RevealedHint } from '../game/hints'

interface Props {
  hints: RevealedHint[]
}

export function HintPanel({ hints }: Props) {
  return (
    <div className="hint-panel">
      <div className="label">Hints unlocked</div>
      {hints.length === 0 ? (
        <p className="hint-empty">
          No hints yet — guess from the map, or a wrong guess unlocks a clue.
        </p>
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

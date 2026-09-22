import type { GuessRecord } from '../game/useGame'

interface Props {
  guesses: GuessRecord[]
}

export function GuessHistory({ guesses }: Props) {
  if (guesses.length === 0) return null
  return (
    <ul className="guess-history">
      {guesses.map((g, i) => (
        <li key={i} className={g.correct ? 'correct' : 'wrong'}>
          {g.correct ? '🟩' : '🟥'} {g.name}
        </li>
      ))}
    </ul>
  )
}

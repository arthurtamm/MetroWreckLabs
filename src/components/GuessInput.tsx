import { useState } from 'react'
import { normalizeName } from '../game/match'

interface Props {
  names: string[]
  disabled: boolean
  onGuess: (name: string) => void
}

export function GuessInput({ names, disabled, onGuess }: Props) {
  const [value, setValue] = useState('')

  const q = normalizeName(value)
  const suggestions = q.length === 0
    ? []
    : names.filter((n) => normalizeName(n).includes(q)).slice(0, 6)

  function submit(name: string) {
    const v = name.trim()
    if (!v) return
    onGuess(v)
    setValue('')
  }

  return (
    <form
      className="guess-input"
      onSubmit={(e) => { e.preventDefault(); submit(value) }}
    >
      <input
        type="text"
        role="textbox"
        placeholder="Who is the mystery person?"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        aria-label="guess"
      />
      {suggestions.length > 0 && (
        <ul className="suggestions">
          {suggestions.map((n) => (
            <li key={n}><button type="button" onClick={() => submit(n)}>{n}</button></li>
          ))}
        </ul>
      )}
    </form>
  )
}

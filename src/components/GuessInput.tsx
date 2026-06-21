import { useState } from 'react'

interface Props {
  disabled: boolean
  onGuess: (name: string) => void
}

// Plain free-text guess box — no autocomplete suggestions, since a dropdown of
// matching names would reveal who's in the pool and act as a hint.
export function GuessInput({ disabled, onGuess }: Props) {
  const [value, setValue] = useState('')

  function submit() {
    const v = value.trim()
    if (!v) return
    onGuess(v)
    setValue('')
  }

  return (
    <form
      className="guess-input"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <input
        type="text"
        placeholder="Who is the mystery person?"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        aria-label="guess"
      />
    </form>
  )
}

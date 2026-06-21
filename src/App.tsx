import { useMemo, useReducer, useState } from 'react'
import './App.css'
import people from './data/people.json'
import type { Person } from './data/types'
import { MapView } from './components/MapView'
import { GuessInput } from './components/GuessInput'
import { HintPanel } from './components/HintPanel'
import { GuessHistory } from './components/GuessHistory'
import { ResultScreen } from './components/ResultScreen'
import { ModeToggle, type Mode } from './components/ModeToggle'
import { gameReducer, initGame, wrongCount } from './game/useGame'
import { findPerson } from './game/match'
import { revealedHints } from './game/hints'
import { formatDate } from './game/formatDate'
import { buildShareText } from './game/share'
import { dailyIndex, todayISO, dailyNumber } from './game/selectDaily'
import { EPOCH, MAX_GUESSES } from './game/constants'

const ALL = people as Person[]

function pickDaily(): { person: Person; number: number } {
  const today = todayISO()
  return {
    person: ALL[dailyIndex(today, EPOCH, ALL.length)],
    number: dailyNumber(today, EPOCH),
  }
}

function pickRandom(): Person {
  return ALL[Math.floor(Math.random() * ALL.length)]
}

export default function App() {
  const [mode, setMode] = useState<Mode>('daily')
  const daily = useMemo(pickDaily, [])
  const [endlessPerson, setEndlessPerson] = useState<Person>(pickRandom)

  const person = mode === 'daily' ? daily.person : endlessPerson
  const [state, dispatch] = useReducer(gameReducer, person, initGame)
  const [notice, setNotice] = useState('')

  // Resolve a typed/clicked guess to a real person, rejecting unknown names and
  // already-guessed people (neither consumes a guess).
  function handleGuess(text: string) {
    const matched = findPerson(text, ALL)
    if (!matched) {
      setNotice(`"${text.trim()}" isn't in the list — pick a name from the suggestions.`)
      return
    }
    if (state.guesses.some((g) => g.id === matched.id)) {
      setNotice(`You already guessed ${matched.name}.`)
      return
    }
    setNotice('')
    dispatch({
      type: 'guess',
      id: matched.id,
      name: matched.name,
      correct: matched.id === person.id,
    })
  }

  // Mode switches and "Play again" call dispatch({ type: 'reset', person })
  // explicitly (see handlers below) to re-init the round for the new person.
  return (
    <div className="app">
      <header className="app-header">
        <h1>MetroWreckLabs</h1>
        <ModeToggle
          mode={mode}
          onChange={(m) => {
            setMode(m)
            setNotice('')
            const next = m === 'daily' ? daily.person : endlessPerson
            dispatch({ type: 'reset', person: next })
          }}
        />
      </header>

      <MapView birth={person.birth} death={person.death} />

      <div className="date-legend">
        <span className="chip born">Born · {formatDate(person.birth.date)}</span>
        <span className="chip died">Died · {formatDate(person.death.date)}</span>
      </div>

      <main className="controls">
        {mode === 'daily' && <p className="puzzle-no">Daily #{daily.number}</p>}

        {state.status === 'playing' ? (
          <>
            <GuessInput disabled={false} onGuess={handleGuess} />
            {notice && <p className="guess-notice">{notice}</p>}
            <HintPanel
              hints={revealedHints(person, wrongCount(state))}
              guessesLeft={MAX_GUESSES - state.guesses.length}
            />
            <GuessHistory guesses={state.guesses} />
          </>
        ) : (
          <ResultScreen
            person={person}
            won={state.status === 'won'}
            shareText={buildShareText({
              puzzleNumber: mode === 'daily' ? daily.number : 0,
              won: state.status === 'won',
              guessCount: state.guesses.length,
              maxGuesses: MAX_GUESSES,
            })}
            onPlayAgain={
              mode === 'endless'
                ? () => {
                    const next = pickRandom()
                    setEndlessPerson(next)
                    setNotice('')
                    dispatch({ type: 'reset', person: next })
                  }
                : null
            }
          />
        )}
      </main>
    </div>
  )
}

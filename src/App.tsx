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
import { revealedHints } from './game/hints'
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
            const next = m === 'daily' ? daily.person : endlessPerson
            dispatch({ type: 'reset', person: next })
          }}
        />
      </header>

      <MapView birth={person.birth} death={person.death} />

      <main className="controls">
        {mode === 'daily' && <p className="puzzle-no">Daily #{daily.number}</p>}

        {state.status === 'playing' ? (
          <>
            <GuessInput
              names={ALL.map((p) => p.name)}
              disabled={false}
              onGuess={(name) => dispatch({ type: 'guess', name })}
            />
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

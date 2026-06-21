import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuessInput } from './GuessInput'

const names = ['Wolfgang Amadeus Mozart', 'Marie Curie', 'Abraham Lincoln']

describe('GuessInput', () => {
  it('shows matching suggestions as the user types', () => {
    render(<GuessInput names={names} disabled={false} onGuess={() => {}} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'mar' } })
    expect(screen.getByText('Marie Curie')).toBeInTheDocument()
    expect(screen.queryByText('Abraham Lincoln')).not.toBeInTheDocument()
  })

  it('submits the typed name on form submit', () => {
    const onGuess = vi.fn()
    render(<GuessInput names={names} disabled={false} onGuess={onGuess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Marie Curie' } })
    fireEvent.submit(screen.getByRole('textbox'))
    expect(onGuess).toHaveBeenCalledWith('Marie Curie')
  })

  it('submits a suggestion when clicked', () => {
    const onGuess = vi.fn()
    render(<GuessInput names={names} disabled={false} onGuess={onGuess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'lin' } })
    fireEvent.click(screen.getByText('Abraham Lincoln'))
    expect(onGuess).toHaveBeenCalledWith('Abraham Lincoln')
  })

  it('does not submit empty input', () => {
    const onGuess = vi.fn()
    render(<GuessInput names={names} disabled={false} onGuess={onGuess} />)
    fireEvent.submit(screen.getByRole('textbox'))
    expect(onGuess).not.toHaveBeenCalled()
  })
})

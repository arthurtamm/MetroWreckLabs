import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { GuessInput } from './GuessInput'

describe('GuessInput', () => {
  it('submits the typed name on form submit', () => {
    const onGuess = vi.fn()
    render(<GuessInput disabled={false} onGuess={onGuess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Marie Curie' } })
    fireEvent.submit(screen.getByRole('textbox'))
    expect(onGuess).toHaveBeenCalledWith('Marie Curie')
  })

  it('does not show any suggestions while typing (no hint)', () => {
    render(<GuessInput disabled={false} onGuess={() => {}} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'mar' } })
    expect(screen.queryByRole('list')).not.toBeInTheDocument()
  })

  it('does not submit empty input', () => {
    const onGuess = vi.fn()
    render(<GuessInput disabled={false} onGuess={onGuess} />)
    fireEvent.submit(screen.getByRole('textbox'))
    expect(onGuess).not.toHaveBeenCalled()
  })

  it('trims whitespace before submitting', () => {
    const onGuess = vi.fn()
    render(<GuessInput disabled={false} onGuess={onGuess} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  Mozart  ' } })
    fireEvent.submit(screen.getByRole('textbox'))
    expect(onGuess).toHaveBeenCalledWith('Mozart')
  })
})

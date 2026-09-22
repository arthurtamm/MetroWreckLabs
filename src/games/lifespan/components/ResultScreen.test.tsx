import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ResultScreen } from './ResultScreen'
import type { Person } from '../data/types'

const mozart = {
  id: 'mozart', name: 'Wolfgang Amadeus Mozart',
  bio: 'A Classical-era composer.',
} as Person

describe('ResultScreen', () => {
  it('announces a win with the name', () => {
    render(<ResultScreen person={mozart} won shareText="x" onPlayAgain={null} />)
    expect(screen.getByText(/Solved/i)).toBeInTheDocument()
    expect(screen.getByText(/Wolfgang Amadeus Mozart/)).toBeInTheDocument()
  })

  it('reveals the name on a loss', () => {
    render(<ResultScreen person={mozart} won={false} shareText="x" onPlayAgain={null} />)
    expect(screen.getByText(/It was/i)).toBeInTheDocument()
    expect(screen.getByText(/Wolfgang Amadeus Mozart/)).toBeInTheDocument()
  })

  it('shows a Play again button in endless mode', () => {
    const onPlayAgain = vi.fn()
    render(<ResultScreen person={mozart} won shareText="x" onPlayAgain={onPlayAgain} />)
    fireEvent.click(screen.getByText(/Play again/i))
    expect(onPlayAgain).toHaveBeenCalled()
  })

  it('hides Play again when onPlayAgain is null (daily)', () => {
    render(<ResultScreen person={mozart} won shareText="x" onPlayAgain={null} />)
    expect(screen.queryByText(/Play again/i)).not.toBeInTheDocument()
  })
})

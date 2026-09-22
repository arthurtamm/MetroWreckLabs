import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GuessDots } from './GuessDots'

describe('GuessDots', () => {
  it('describes progress for assistive tech', () => {
    render(<GuessDots used={2} max={6} />)
    expect(screen.getByRole('img', { name: '2 of 6 guesses used' })).toBeInTheDocument()
  })

  it('renders one dot per allowed guess', () => {
    render(<GuessDots used={2} max={6} />)
    expect(screen.getByRole('img').children).toHaveLength(6)
  })

  it('marks exactly the used dots', () => {
    render(<GuessDots used={2} max={6} />)
    expect(screen.getByRole('img').querySelectorAll('.used')).toHaveLength(2)
  })

  it('handles a fresh round', () => {
    render(<GuessDots used={0} max={6} />)
    expect(screen.getByRole('img', { name: '0 of 6 guesses used' })).toBeInTheDocument()
    expect(screen.getByRole('img').querySelectorAll('.used')).toHaveLength(0)
  })
})

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Hub } from './Hub'
import type { GameMeta } from './games'

const games: GameMeta[] = [
  {
    id: 'alpha', name: 'Alpha', tagline: 'The first game', status: 'live',
    tiles: ['born', 'border', 'border', 'died'], howToPlay: <p>alpha rules</p>,
    load: async () => ({ default: () => <p>alpha game</p> }),
  },
  {
    id: 'beta', name: 'Beta', tagline: 'Not yet', status: 'soon',
    tiles: ['border', 'border', 'border', 'border'], howToPlay: <p>beta rules</p>,
  },
]

describe('Hub', () => {
  it('renders a row per registry entry', () => {
    render(<Hub games={games} />)
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByText('Beta')).toBeInTheDocument()
  })

  it('shows each game tagline', () => {
    render(<Hub games={games} />)
    expect(screen.getByText('The first game')).toBeInTheDocument()
    expect(screen.getByText('Not yet')).toBeInTheDocument()
  })

  it('links a live game to its hash route', () => {
    render(<Hub games={games} />)
    expect(screen.getByRole('link', { name: /Play Alpha/i })).toHaveAttribute('href', '#/alpha')
  })

  it('does not make a coming-soon game clickable', () => {
    render(<Hub games={games} />)
    expect(screen.queryByRole('link', { name: /Beta/i })).not.toBeInTheDocument()
    expect(screen.getByText('Soon')).toBeInTheDocument()
  })

  it('shows the injected date in the hero', () => {
    render(<Hub games={games} today={new Date(2026, 8, 22)} />)
    expect(screen.getByText('September 22, 2026')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Daily puzzles' })).toBeInTheDocument()
  })
})

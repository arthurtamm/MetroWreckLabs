import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Shell } from './Shell'
import type { GameMeta } from './games'

const games: GameMeta[] = [
  {
    id: 'alpha', name: 'Alpha', tagline: 'The first game', status: 'live',
    tiles: ['born', 'border', 'border', 'died'], howToPlay: <p>alpha rules</p>,
    load: async () => ({ default: () => <p>alpha game body</p> }),
  },
  {
    id: 'beta', name: 'Beta', tagline: 'Not yet', status: 'soon',
    tiles: ['border', 'border', 'border', 'border'], howToPlay: <p>beta rules</p>,
  },
]

function setHash(hash: string) {
  window.location.hash = hash
}

describe('Shell', () => {
  beforeEach(() => setHash('#/'))

  it('shows the hub at the root', () => {
    render(<Shell games={games} />)
    expect(screen.getByRole('heading', { name: 'Daily puzzles' })).toBeInTheDocument()
  })

  it('shows the wordmark on the hub', () => {
    render(<Shell games={games} />)
    expect(screen.getByRole('link', { name: 'MetroWreckLabs' })).toHaveAttribute('href', '#/')
  })

  it('falls back to the hub for an unknown route', () => {
    setHash('#/does-not-exist')
    render(<Shell games={games} />)
    expect(screen.getByRole('heading', { name: 'Daily puzzles' })).toBeInTheDocument()
  })

  it('falls back to the hub for a coming-soon game', () => {
    setHash('#/beta')
    render(<Shell games={games} />)
    expect(screen.getByRole('heading', { name: 'Daily puzzles' })).toBeInTheDocument()
  })

  it('loads a live game for its route', async () => {
    setHash('#/alpha')
    render(<Shell games={games} />)
    expect(await screen.findByText('alpha game body')).toBeInTheDocument()
  })

  it('shows the game name and a back link inside a game', async () => {
    setHash('#/alpha')
    render(<Shell games={games} />)
    await screen.findByText('alpha game body')
    expect(screen.getByText('Alpha')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to all games/i })).toHaveAttribute('href', '#/')
  })

  it('opens how-to-play for the active game', async () => {
    setHash('#/alpha')
    render(<Shell games={games} />)
    await screen.findByText('alpha game body')

    fireEvent.click(screen.getByRole('button', { name: /how to play/i }))
    expect(screen.getByRole('dialog', { name: /how to play alpha/i })).toBeInTheDocument()
    expect(screen.getByText('alpha rules')).toBeInTheDocument()
  })

  it('opens a platform-level how-to-play on the hub', () => {
    render(<Shell games={games} />)
    fireEvent.click(screen.getByRole('button', { name: /how to play/i }))
    expect(screen.getByRole('dialog', { name: /how to play metrowrecklabs/i })).toBeInTheDocument()
  })
})

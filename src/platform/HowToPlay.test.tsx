import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { HowToPlay } from './HowToPlay'

describe('HowToPlay', () => {
  it('renders as a dialog titled for the game', () => {
    render(<HowToPlay title="Alpha" onClose={() => {}}><p>the rules</p></HowToPlay>)
    expect(screen.getByRole('dialog', { name: /how to play alpha/i })).toBeInTheDocument()
    expect(screen.getByText('the rules')).toBeInTheDocument()
  })

  it('closes on the close button', () => {
    const onClose = vi.fn()
    render(<HowToPlay title="Alpha" onClose={onClose}><p>the rules</p></HowToPlay>)
    fireEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<HowToPlay title="Alpha" onClose={onClose}><p>the rules</p></HowToPlay>)
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('closes when the backdrop is clicked but not the panel', () => {
    const onClose = vi.fn()
    render(<HowToPlay title="Alpha" onClose={onClose}><p>the rules</p></HowToPlay>)

    fireEvent.click(screen.getByText('the rules'))
    expect(onClose).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('modal-scrim'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('moves focus to the close button on open', () => {
    render(<HowToPlay title="Alpha" onClose={() => {}}><p>the rules</p></HowToPlay>)
    expect(screen.getByRole('button', { name: /close/i })).toHaveFocus()
  })
})

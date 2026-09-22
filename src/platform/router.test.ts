import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { parseHash, useHashRoute } from './router'

describe('parseHash', () => {
  it('extracts the id from a rooted hash', () => {
    expect(parseHash('#/lifespan')).toBe('lifespan')
  })

  it('accepts a hash without the slash', () => {
    expect(parseHash('#lifespan')).toBe('lifespan')
  })

  it('returns empty string for the hub', () => {
    expect(parseHash('')).toBe('')
    expect(parseHash('#')).toBe('')
    expect(parseHash('#/')).toBe('')
  })

  it('ignores extra segments and query strings', () => {
    expect(parseHash('#/lifespan/archive')).toBe('lifespan')
    expect(parseHash('#/lifespan?debug=1')).toBe('lifespan')
  })
})

describe('useHashRoute', () => {
  it('reports the current hash', () => {
    window.location.hash = '#/lifespan'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current).toBe('lifespan')
  })

  it('re-renders when the hash changes', () => {
    window.location.hash = '#/'
    const { result } = renderHook(() => useHashRoute())
    expect(result.current).toBe('')

    act(() => {
      window.location.hash = '#/lifespan'
      window.dispatchEvent(new Event('hashchange'))
    })

    expect(result.current).toBe('lifespan')
  })
})

import { describe, it, expect } from 'vitest'
import { dailyIndex } from './selectDaily'

describe('dailyIndex', () => {
  it('returns 0 on the epoch date', () => {
    expect(dailyIndex('2026-06-21', '2026-06-21', 8)).toBe(0)
  })

  it('advances by one each day', () => {
    expect(dailyIndex('2026-06-22', '2026-06-21', 8)).toBe(1)
    expect(dailyIndex('2026-06-29', '2026-06-21', 8)).toBe(0) // wraps mod 8
  })

  it('handles month boundaries', () => {
    expect(dailyIndex('2026-07-01', '2026-06-21', 8)).toBe(10 % 8)
  })

  it('never returns negative for dates before epoch', () => {
    const i = dailyIndex('2026-06-20', '2026-06-21', 8)
    expect(i).toBeGreaterThanOrEqual(0)
    expect(i).toBeLessThan(8)
  })
})

import { describe, it, expect } from 'vitest'
import { formatDate } from './formatDate'

describe('formatDate', () => {
  it('formats an ISO date as "D Mon YYYY"', () => {
    expect(formatDate('1756-01-27')).toBe('27 Jan 1756')
    expect(formatDate('1791-12-05')).toBe('5 Dec 1791')
  })
  it('strips leading zeros from day', () => {
    expect(formatDate('1869-10-02')).toBe('2 Oct 1869')
  })
})

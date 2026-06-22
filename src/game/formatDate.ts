const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/**
 * Format a stored date for display. Accepts:
 *   "1756-01-27" -> "27 Jan 1756"   (full modern date)
 *   "-0044"      -> "44 BC"          (year-only, BC)
 *   "0323" / "323" -> "323"          (year-only)
 * A leading "-" marks BC; a value with no month/day shows just the year.
 */
export function formatDate(iso: string): string {
  const bc = iso.startsWith('-')
  const body = bc ? iso.slice(1) : iso
  const parts = body.split('-')
  const year = parseInt(parts[0], 10)
  const suffix = bc ? ' BC' : ''

  if (parts.length < 3) return `${year}${suffix}` // year-only

  const month = MONTHS[parseInt(parts[1], 10) - 1] ?? parts[1]
  return `${parseInt(parts[2], 10)} ${month} ${year}${suffix}`
}

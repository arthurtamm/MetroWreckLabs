const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

/** Format an ISO YYYY-MM-DD string as "27 Jan 1756" (no timezone parsing). */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split('-')
  const month = MONTHS[parseInt(m, 10) - 1] ?? m
  return `${parseInt(d, 10)} ${month} ${parseInt(y, 10)}`
}

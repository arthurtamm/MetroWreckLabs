/** Whole days between two ISO YYYY-MM-DD dates (UTC midnight, no DST drift). */
function daysBetween(isoA: string, isoB: string): number {
  const a = Date.UTC(
    +isoA.slice(0, 4), +isoA.slice(5, 7) - 1, +isoA.slice(8, 10),
  )
  const b = Date.UTC(
    +isoB.slice(0, 4), +isoB.slice(5, 7) - 1, +isoB.slice(8, 10),
  )
  return Math.round((a - b) / 86_400_000)
}

/** Deterministic index into the people list for a given calendar day. */
export function dailyIndex(today: string, epoch: string, count: number): number {
  const diff = daysBetween(today, epoch)
  return ((diff % count) + count) % count
}

/** Today's date as local ISO YYYY-MM-DD. */
export function todayISO(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Puzzle number shown to players (1-based). */
export function dailyNumber(today: string, epoch: string): number {
  return daysBetween(today, epoch) + 1
}

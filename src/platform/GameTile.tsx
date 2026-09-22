import type { TileToken } from './games'

interface Props {
  tiles: [TileToken, TileToken, TileToken, TileToken]
  dimmed?: boolean
}

/**
 * The 2x2 square that identifies a game, in the spirit of NYT Games' icons.
 * Decorative — the game's name sits next to it — so it is hidden from
 * assistive tech rather than described.
 */
export function GameTile({ tiles, dimmed = false }: Props) {
  return (
    <span className={dimmed ? 'game-tile dimmed' : 'game-tile'} aria-hidden="true">
      {tiles.map((token, i) => (
        <i key={i} style={{ background: `var(--${token})` }} />
      ))}
    </span>
  )
}

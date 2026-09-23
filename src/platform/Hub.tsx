import { GAMES, type GameMeta } from './games'
import { GameTile } from './GameTile'

interface Props {
  /** Defaults to the real registry; tests inject a fixture. */
  games?: GameMeta[]
  /** Injectable so the hero date is deterministic under test. */
  today?: Date
}

const DATE_FORMAT: Intl.DateTimeFormatOptions = {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}

export function Hub({ games = GAMES, today = new Date() }: Props) {
  return (
    <div className="hub">
      <div className="hub-hero">
        <h1>Daily puzzles</h1>
        <p>{today.toLocaleDateString('en-US', DATE_FORMAT)}</p>
      </div>

      <ul className="hub-list">
        {games.map((game) => (
          <li key={game.id} className="hub-row">
            <GameTile tiles={game.tiles} dimmed={game.status === 'soon'} />

            <div className="hub-row-text">
              <h2>{game.name}</h2>
              <p>{game.tagline}</p>
            </div>

            {game.status === 'live' ? (
              <a className="hub-play" href={`#/${game.id}`} aria-label={`Play ${game.name}`}>
                Play
              </a>
            ) : (
              <span className="hub-soon">Soon</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

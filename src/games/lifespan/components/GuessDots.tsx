interface Props {
  used: number
  max: number
}

/*
 * The dots replace the sentence "N of 6 guesses left", so they must carry
 * that information for screen readers themselves — hence role="img" with an
 * explicit label rather than six undescribed decorations.
 */
export function GuessDots({ used, max }: Props) {
  return (
    <div className="guess-dots" role="img" aria-label={`${used} of ${max} guesses used`}>
      {Array.from({ length: max }, (_, i) => (
        <i key={i} className={i < used ? 'used' : ''} />
      ))}
    </div>
  )
}

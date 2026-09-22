export type Mode = 'daily' | 'endless'

interface Props {
  mode: Mode
  onChange: (mode: Mode) => void
}

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div className="mode-toggle" role="tablist">
      <button
        role="tab"
        aria-selected={mode === 'daily'}
        className={mode === 'daily' ? 'active' : ''}
        onClick={() => onChange('daily')}
      >Daily</button>
      <button
        role="tab"
        aria-selected={mode === 'endless'}
        className={mode === 'endless' ? 'active' : ''}
        onClick={() => onChange('endless')}
      >Endless</button>
    </div>
  )
}

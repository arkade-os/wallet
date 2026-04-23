import { Checkbox as ShadcnCheckbox } from './ui/checkbox'
import FlexRow from './FlexRow'

interface CheckboxProps {
  onChange: () => void
  text: string
}

export default function Checkbox({ onChange, text }: CheckboxProps) {
  // Haptic feedback is owned by the primitive (fires 'selection' on change);
  // do NOT call hapticLight() here or taps will double-fire.
  return (
    <div
      style={{
        borderRadius: '0.5rem',
        // --elevation-sm adapts to dark mode automatically (tokens.css sets a
        // white-alpha rim variant under .dark).
        boxShadow: 'var(--elevation-sm)',
        margin: '0 2px',
        padding: '0.5rem',
        width: '100%',
      }}
    >
      <FlexRow>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', width: '100%' }}>
          <ShadcnCheckbox onCheckedChange={onChange} />
          <span style={{ fontSize: 13 }}>{text}</span>
        </label>
      </FlexRow>
    </div>
  )
}

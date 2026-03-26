import { Checkbox as ShadcnCheckbox } from './ui/checkbox'
import FlexRow from './FlexRow'
import { hapticLight } from '../lib/haptics'

interface CheckboxProps {
  onChange: () => void
  text: string
}

export default function Checkbox({ onChange, text }: CheckboxProps) {
  const handleChange = () => {
    hapticLight()
    onChange()
  }

  return (
    <div
      style={{
        border: '1px solid var(--dark50)',
        borderRadius: '0.5rem',
        margin: '0 2px',
        padding: '0.5rem',
        width: '100%',
      }}
    >
      <FlexRow>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', width: '100%' }}>
          <ShadcnCheckbox onCheckedChange={handleChange} />
          <span style={{ fontSize: 13 }}>{text}</span>
        </label>
      </FlexRow>
    </div>
  )
}

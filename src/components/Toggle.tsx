import { useId } from 'react'
import { Switch } from '@/components/ui/switch'
import { hapticLight } from '../lib/haptics'

interface ToggleProps {
  checked: boolean
  onClick: () => void
  subtext?: string
  text: string
  testId?: string
}

export default function Toggle({ checked, onClick, text, subtext, testId }: ToggleProps) {
  const descriptionId = useId()
  const handleChange = () => {
    hapticLight()
    onClick()
  }

  return (
    <div className='settings-row-group settings-toggle-card'>
      <div className='settings-toggle-card__main'>
        <span>
          <span className='settings-row__label'>{text}</span>
          {subtext ? (
            <span id={descriptionId} className='settings-toggle-card__subtext'>
              {subtext}
            </span>
          ) : null}
        </span>
        <Switch
          aria-label={text}
          aria-describedby={subtext ? descriptionId : undefined}
          checked={checked}
          onCheckedChange={handleChange}
          data-testid={testId}
          data-checked={checked ? 'true' : 'false'}
          size='lg'
        />
      </div>
    </div>
  )
}

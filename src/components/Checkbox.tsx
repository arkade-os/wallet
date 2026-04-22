import FlexRow from './FlexRow'
import { hapticLight } from '../lib/haptics'
import { useState } from 'react'
import Text from './Text'
import Focusable from './Focusable'

interface CheckboxProps {
  onChange: () => void
  text: string
}

export default function Checkbox({ onChange, text }: CheckboxProps) {
  const [checked, setChecked] = useState(false)

  const handleChange = () => {
    setChecked(!checked)
    hapticLight()
    onChange()
  }

  const style: React.CSSProperties = {
    border: '1px solid var(--dark50)',
    borderRadius: '0.5rem',
    margin: '0 2px',
    padding: '0.5rem',
    width: '100%',
  }
  return (
    <div style={style}>
      <Focusable onEnter={handleChange} fit>
        <FlexRow onClick={handleChange} gap='0.5rem'>
          <BoxIcon checked={checked} />
          <Text small>{text}</Text>
        </FlexRow>
      </Focusable>
    </div>
  )
}

const BoxIcon = ({ checked }: { checked: boolean }) => {
  const color = checked ? 'var(--red)' : 'var(--dark50)'
  const svgStyle: React.CSSProperties = {
    background: color,
    borderColor: color,
    borderRadius: '6px',
    padding: '2px',
  }
  const pathStyle: React.CSSProperties = {
    fill: 'none',
    strokeWidth: 2,
    stroke: '#fff',
    strokeDasharray: 30,
    strokeDashoffset: 0,
  }
  return (
    <svg width='24' height='24' viewBox='0 0 24 24' aria-hidden='true' style={svgStyle}>
      {checked ? <path d='M1.73,12.91 8.1,19.28 22.79,4.59' style={pathStyle} /> : null}
    </svg>
  )
}

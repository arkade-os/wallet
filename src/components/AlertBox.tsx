import FlexRow from './FlexRow'
import Text from './Text'

interface AlertProps {
  text: string
}

export default function AlertBox({ text }: AlertProps) {
  const style = {
    backgroundColor: 'var(--red)',
    border: `1px solid var(--dark20)`,
    borderRadius: '0.5rem',
    padding: '0.5rem',
    color: 'white',
    width: '100%',
  }

  return (
    <div style={{ padding: '2px', width: '100%' }}>
      <div style={style}>
        <FlexRow gap='0.5rem'>
          <PulsingCircle />
          <Text bold color='white' small wrap>
            {text}
          </Text>
        </FlexRow>
      </div>
    </div>
  )
}

const PulsingCircle = () => (
  <svg width='24' height='24' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'>
    <circle cx='20' cy='20' fill='none' r='10' stroke='white' strokeWidth='4'>
      <animate attributeName='r' from='8' to='20' dur='1s' begin='0s' repeatCount='indefinite' />
      <animate attributeName='opacity' from='1' to='0' dur='1s' begin='0s' repeatCount='indefinite' />
    </circle>
  </svg>
)

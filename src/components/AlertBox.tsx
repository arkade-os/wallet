import { LogoIconAnimated } from '../icons/Logo'
import MegaphoneIcon from '../icons/Megaphone'
import FlexRow from './FlexRow'
import Text from './Text'

interface AlertProps {
  icon: JSX.Element
  text: string
}

function AlertBox({ icon, text }: AlertProps) {
  const style = {
    backgroundColor: 'var(--purple20)',
    border: '1px solid var(--dark20)',
    borderRadius: '0.5rem',
    padding: '0.5rem',
    color: 'white',
    width: '100%',
  }

  return (
    <div style={{ padding: '2px', width: '100%' }}>
      <div style={style}>
        <FlexRow gap='0.5rem'>
          <AlertBoxIcon>{icon}</AlertBoxIcon>
          <Text color='black' bold tiny wrap>
            {text}
          </Text>
        </FlexRow>
      </div>
    </div>
  )
}

function AlertBoxIcon({ children }: { children: React.ReactNode }) {
  const style = {
    backgroundColor: 'var(--purple)',
    borderRadius: '6px',
    padding: '5px',
  }
  return <div style={style}>{children}</div>
}

export function InfoBox({ text }: { text: string }) {
  return <AlertBox icon={<MegaphoneIcon animated />} text={text} />
}

export function WaitBox({ text }: { text: string }) {
  return (
    <div style={{ width: '304px' }}>
      <AlertBox icon={<LogoIconAnimated />} text={text} />
    </div>
  )
}

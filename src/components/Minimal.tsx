import { ReactNode } from 'react'
import FlexRow from './FlexRow'
import LogoIcon from '../icons/Logo'

export default function Minimal({ children }: { children: ReactNode }) {
  return (
    <div style={{ height: '50px', margin: 'auto', padding: '8px 0', width: '360px' }}>
      <FlexRow between>
        <a href={window.location.origin} target='_blank'>
          <LogoIcon small />
        </a>
        {children}
      </FlexRow>
    </div>
  )
}

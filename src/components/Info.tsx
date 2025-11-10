import FlexRow from './FlexRow'
import InfoIcon, { InfoIconDark } from '../icons/Info'
import FlexCol from './FlexCol'
import Text, { TextSecondary } from './Text'
import { ReactElement, ReactNode } from 'react'

interface InfoProps {
  children: ReactNode
  color: string
  icon?: ReactElement
  title: string
}

export default function Info({ children, color, icon, title }: InfoProps) {
  return (
    <FlexCol margin='0 0 2rem 0'>
      <FlexRow color={color}>
        {icon}
        <Text bold>{title}</Text>
      </FlexRow>
      <hr style={{ backgroundColor: 'var(--dark20)', width: '100%' }} />
      <FlexRow alignItems='flex-start'>
        <div style={{ marginTop: '2px' }}>
          <InfoIconDark />
        </div>
        <FlexCol gap='0.5rem'>{children}</FlexCol>
      </FlexRow>
    </FlexCol>
  )
}

export function InfoLine({ centered, color, text }: { centered?: boolean; color?: string; text: string }) {
  return (
    <FlexCol margin='0 0 2rem 0'>
      <FlexRow centered={centered}>
        <InfoIcon color={color ?? 'dark50'} />
        <TextSecondary>{text}</TextSecondary>
      </FlexRow>
    </FlexCol>
  )
}

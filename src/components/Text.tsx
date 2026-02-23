import { IonText, useIonToast } from '@ionic/react'
import { ReactNode } from 'react'
import { copyToClipboard } from '../lib/clipboard'
import { copiedToClipboard } from '../lib/toast'

interface TextProps {
  big?: boolean
  bigger?: boolean
  bold?: boolean
  capitalize?: boolean
  centered?: boolean
  children: ReactNode
  color?: string
  copy?: string
  fullWidth?: boolean
  heading?: boolean
  large?: boolean
  medium?: boolean
  right?: boolean
  smaller?: boolean
  small?: boolean
  thin?: boolean
  tiny?: boolean
  wrap?: boolean
}

export default function Text({
  big,
  bigger,
  bold,
  capitalize,
  centered,
  children,
  color,
  copy,
  fullWidth,
  heading,
  large,
  medium,
  right,
  smaller,
  small,
  thin,
  tiny,
  wrap,
}: TextProps) {
  const fontSize = tiny ? 12 : smaller ? 13 : small ? 14 : big ? 24 : bigger ? 32 : large ? 18 : 16

  const className = capitalize ? 'first-letter' : ''

  const pStyle: any = {
    color: color ? `var(--${color})` : undefined,
    cursor: copy ? 'pointer' : undefined,
    fontFamily: heading ? 'var(--heading-font)' : undefined,
    fontSize,
    fontWeight: thin ? '400' : medium ? '500' : bold ? (heading ? '700' : '600') : undefined,
    letterSpacing: heading ? '-0.5px' : undefined,
    lineHeight: heading ? (bigger || big ? '1.2' : large ? '1.4' : '1.5') : tiny ? '1' : '1.5',
    overflow: wrap ? undefined : 'hidden',
    textAlign: centered ? 'center' : right ? 'right' : undefined,
    textOverflow: wrap ? undefined : 'ellipsis',
    whiteSpace: wrap ? undefined : 'nowrap',
    wordBreak: 'break-word',
  }

  const iStyle: any = {
    width: fullWidth ? '100%' : undefined,
  }

  const [present] = useIonToast()

  const handleClick = () => {
    if (!copy) return
    copyToClipboard(copy)
    present(copiedToClipboard)
  }

  return (
    <IonText style={iStyle}>
      <p className={className} onClick={handleClick} style={pStyle}>
        {children}
      </p>
    </IonText>
  )
}

export function TextLabel({ children }: TextProps) {
  return (
    <div style={{ padding: '0.5rem 1rem' }}>
      <Text capitalize color='dark50' smaller>
        {children}
      </Text>
    </div>
  )
}

export function TextSecondary({ centered, children }: TextProps) {
  return (
    <Text centered={centered} color='dark50' small thin wrap>
      {children}
    </Text>
  )
}

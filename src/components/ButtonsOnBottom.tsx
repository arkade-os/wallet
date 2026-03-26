import { ReactNode } from 'react'
import FlexCol from './FlexCol'

interface ButtonsOnBottomProps {
  bordered?: boolean
  children: ReactNode
}

export default function ButtonsOnBottom({ bordered, children }: ButtonsOnBottomProps) {
  const borderStyle = {
    backgroundColor: 'var(--dark10)',
    marginTop: '1rem',
    width: '100%',
  }

  const footerStyle: React.CSSProperties = {
    padding: '1rem',
    paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
  }

  return (
    <>
      {bordered ? <hr style={borderStyle} /> : null}
      <footer role='contentinfo' style={footerStyle}>
        <FlexCol gap='0' strech>
          {children}
        </FlexCol>
      </footer>
    </>
  )
}

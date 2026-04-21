import { ReactNode } from 'react'
import FlexCol from './FlexCol'

interface ButtonsOnBottomProps {
  children: ReactNode
}

export default function ButtonsOnBottom({ children }: ButtonsOnBottomProps) {
  return (
    <footer className='buttons-on-bottom'>
      <FlexCol gap='0' strech>
        {children}
      </FlexCol>
    </footer>
  )
}

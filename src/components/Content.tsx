import { ReactNode } from 'react'
import Refresher from './Refresher'

interface ContentProps {
  children: ReactNode
  noFade?: boolean
}

export default function Content({ children, noFade }: ContentProps) {
  const className = noFade ? 'content no-content-fade' : 'content'
  return (
    <div className={className}>
      <Refresher />
      <div className='content-shell'>{children}</div>
    </div>
  )
}

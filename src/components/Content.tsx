import { ReactNode } from 'react'
import Refresher from './Refresher'

interface ContentProps {
  children: ReactNode
  noFade?: boolean
  noRefresh?: boolean
}

export default function Content({ children, noFade, noRefresh }: ContentProps) {
  const className = noFade ? 'content no-content-fade' : 'content'
  return (
    <div className={className}>
      {noRefresh ? null : <Refresher />}
      <div className='content-shell'>{children}</div>
    </div>
  )
}

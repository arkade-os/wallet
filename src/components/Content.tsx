import { ReactNode } from 'react'
import Refresher from './Refresher'

interface ContentProps {
  children: ReactNode
  className?: string
  noFade?: boolean
  noRefresh?: boolean
}

export default function Content({ children, className, noFade, noRefresh }: ContentProps) {
  const classes = [noFade ? 'content no-content-fade' : 'content', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      {noRefresh ? null : <Refresher />}
      <div className='content-shell'>{children}</div>
    </div>
  )
}

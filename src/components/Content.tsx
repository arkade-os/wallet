import { ReactNode } from 'react'
import Refresher from './Refresher'

interface ContentProps {
  children: ReactNode
  className?: string
  noFade?: boolean
  noRefresh?: boolean
  onRefresh?: () => Promise<void> | void
}

export default function Content({ children, className, noFade, noRefresh, onRefresh }: ContentProps) {
  const classes = [noFade ? 'content no-content-fade' : 'content', className].filter(Boolean).join(' ')
  return (
    <div className={classes}>
      {noRefresh ? null : <Refresher onRefresh={onRefresh} />}
      <div className='content-shell'>{children}</div>
    </div>
  )
}

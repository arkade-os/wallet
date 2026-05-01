import { ReactNode } from 'react'
import Refresher from './Refresher'
import { cn } from '@/lib/utils'

interface ContentProps {
  children: ReactNode
  noFade?: boolean
  className?: string
}

export default function Content({ children, noFade, className }: ContentProps) {
  const baseClass = noFade ? 'content no-content-fade' : 'content'
  return (
    <div className={cn(baseClass, className)}>
      <Refresher />
      <div className="content-shell">{children}</div>
    </div>
  )
}

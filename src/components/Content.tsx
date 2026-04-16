import { ReactNode, useRef } from 'react'
import { useRefresher } from './Refresher'

interface ContentProps {
  children: ReactNode
  noFade?: boolean
}

export default function Content({ children, noFade }: ContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const { handleTouchStart, handleTouchMove, handleTouchEnd, refreshing, pullOffset } = useRefresher(scrollRef)

  const style: React.CSSProperties = {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'hidden',
    scrollbarWidth: 'none',
    position: 'relative',
    touchAction: 'pan-x pan-down pinch-zoom',
  }

  return (
    <main
      role='main'
      ref={scrollRef}
      style={style}
      className={noFade ? 'no-content-fade' : undefined}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {pullOffset > 0 || refreshing ? (
        <div
          style={{
            textAlign: 'center',
            padding: '0.5rem',
            color: 'var(--neutral-500)',
            fontSize: '0.75rem',
            height: pullOffset > 0 ? pullOffset : 'auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: pullOffset === 0 ? 'height 200ms ease-out' : 'none',
          }}
        >
          {refreshing ? 'Refreshing...' : 'Pull to refresh'}
        </div>
      ) : null}
      <div className='content-shell'>{children}</div>
    </main>
  )
}

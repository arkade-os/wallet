import { ReactNode, useRef } from 'react'
import { usePullToRefresh } from '../hooks/usePullToRefresh'

interface ContentProps {
  children: ReactNode
  className?: string
  noFade?: boolean
  onPullToRefresh?: () => Promise<void>
}

// Simple iOS-style spinner
function Spinner() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      style={{ animation: 'ptr-spin 0.8s linear infinite' }}
    >
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="0.2" />
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="0.3" transform="rotate(45 12 12)" />
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="0.4" transform="rotate(90 12 12)" />
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="0.5" transform="rotate(135 12 12)" />
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="0.6" transform="rotate(180 12 12)" />
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="0.7" transform="rotate(225 12 12)" />
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="0.85" transform="rotate(270 12 12)" />
      <circle cx="12" cy="2.5" r="1.5" fill="currentColor" opacity="1" transform="rotate(315 12 12)" />
    </svg>
  )
}

// Arrow that rotates based on pull progress
function PullArrow({ progress }: { progress: number }) {
  const rotation = progress * 180
  const opacity = 0.4 + progress * 0.6

  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      style={{
        opacity,
        transform: `rotate(${rotation}deg)`,
        transition: 'transform 0.1s ease-out',
      }}
    >
      <path
        d="M12 4v12m0 0l-4-4m4 4l4-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function Content({ children, className, noFade, onPullToRefresh }: ContentProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  const { pullOffset, isRefreshing, progress } = usePullToRefresh({
    scrollRef,
    onRefresh: onPullToRefresh,
    threshold: 60,
  })

  const showIndicator = pullOffset > 0 || isRefreshing
  const indicatorOffset = isRefreshing ? 60 : pullOffset

  // Spring-like transition when releasing
  const transition = pullOffset === 0 && !isRefreshing
    ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
    : 'none'

  return (
    <main
      role="main"
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        scrollbarWidth: 'none',
        position: 'relative',
        touchAction: onPullToRefresh ? 'pan-y' : undefined,
      }}
      className={[noFade ? 'no-content-fade' : '', className].filter(Boolean).join(' ') || undefined}
    >
      {/* Indicator in the space above content */}
      {onPullToRefresh ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: indicatorOffset,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: progress >= 1 ? 'var(--purple-700)' : 'var(--neutral-400)',
            opacity: showIndicator ? 1 : 0,
            transition: 'color 0.15s ease',
            pointerEvents: 'none',
          }}
        >
          {isRefreshing ? <Spinner /> : <PullArrow progress={progress} />}
        </div>
      ) : null}

      {/* Content translates down */}
      <div
        className="content-shell"
        style={{
          transform: `translateY(${indicatorOffset}px)`,
          transition,
        }}
      >
        {children}
      </div>
    </main>
  )
}

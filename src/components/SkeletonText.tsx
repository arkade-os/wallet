/**
 * One shimmering bar standing in for text that has not arrived.
 *
 * Shared rather than per-screen: the swap composer waits on a quote, the
 * activity list waits on the restore scan, and two shimmers tuned separately
 * read as two different loading states.
 */
export default function SkeletonText({ width, className }: { width: string; className?: string }) {
  return (
    <span className={className ? `skeleton-text ${className}` : 'skeleton-text'} style={{ width }} aria-hidden='true' />
  )
}

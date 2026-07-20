import { Badge } from './ui/badge'

/** Trust chip shown wherever an unverified asset's self-reported metadata is displayed. */
export default function UnverifiedBadge() {
  return (
    <Badge variant='outline' className='ml-1.5'>
      Unverified
    </Badge>
  )
}

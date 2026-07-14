import { type SignerStatus } from '@arkade-os/sdk'
import Text from './Text'

export default function DeprecatedSignerBadge({ status }: { status: SignerStatus | null }) {
  if (status === 'EXPIRED')
    return (
      <Text tiny color='red'>
        deprecated signer · past cutoff
      </Text>
    )
  if (status === 'MIGRATABLE' || status === 'DUE_NOW')
    return (
      <Text tiny color='orange'>
        deprecated signer
      </Text>
    )
  return null
}

import Text from './Text'
import Shadow from './Shadow'
import FlexCol from './FlexCol'
import FlexRow from './FlexRow'
import AssetAvatar from './AssetAvatar'
import { centsToUnits, truncatedAssetId } from '../lib/assets'
import { prettyNumber } from '../lib/format'

interface AssetCardProps {
  assetId: string
  balance: number
  darkPurple?: boolean
  decimals?: number
  icon?: string
  name?: string
  ticker?: string
  onClick?: () => void
}
export default function AssetCard({
  assetId,
  balance,
  darkPurple,
  decimals,
  icon,
  name,
  ticker,
  onClick,
}: AssetCardProps) {
  const assetName = name || truncatedAssetId(assetId) || 'Asset name'
  const tokenTick = ticker ? ticker : 'TKN'
  return (
    <Shadow key={assetId} border onClick={onClick} darkPurple={darkPurple}>
      <FlexRow between padding='0.75rem' testId={tokenTick}>
        <FlexRow>
          <AssetAvatar icon={icon} name={name} ticker={ticker} size={32} assetId={assetId} clickable />
          <FlexCol gap='0'>
            <Text bold>{assetName}</Text>
            <Text color='white' smaller>
              {tokenTick}
            </Text>
          </FlexCol>
        </FlexRow>
        <FlexCol end>
          <Text>{prettyNumber(centsToUnits(balance, decimals ?? 8))}</Text>
        </FlexCol>
      </FlexRow>
    </Shadow>
  )
}

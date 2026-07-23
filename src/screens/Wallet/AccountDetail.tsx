import { useContext } from 'react'
import { FlowContext } from '../../providers/flow'
import BitcoinDetail from './BitcoinDetail'

export default function AccountDetail() {
  const { assetInfo } = useContext(FlowContext)
  return <BitcoinDetail assetId={assetInfo.assetId} />
}

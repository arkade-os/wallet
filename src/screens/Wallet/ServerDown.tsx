import CenterScreen from '../../components/CenterScreen'
import ErrorMessage from '../../components/Error'
import WalletNewIcon from '../../icons/WalletNew'
import Text from '../../components/Text'

export default function ServerDown() {
  return (
    <CenterScreen>
      <WalletNewIcon />
      <Text bigger>Arkade Wallet</Text>
      <ErrorMessage error text='Ark server unreachable' />
    </CenterScreen>
  )
}

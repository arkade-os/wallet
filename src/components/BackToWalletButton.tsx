import { useContext } from 'react'
import { NavigationContext, Pages } from '../providers/navigation'
import Button from './Button'

export default function BackToWalletButton() {
  const { navigate } = useContext(NavigationContext)

  const goBack = () => {
    navigate(Pages.Wallet)
  }

  return <Button onClick={goBack} label='Back to wallet' secondary />
}

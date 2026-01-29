import { useContext, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { AspContext } from '../../providers/asp'
import ErrorMessage from '../../components/Error'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import CenterScreen from '../../components/CenterScreen'
import Text from '../../components/Text'
import FlexCol from '../../components/FlexCol'
import { deriveKeyFromSeed } from '../../lib/wallet'
import SheetModal from '../../components/SheetModal'
import WalletNewIcon from '../../icons/WalletNew'
import { defaultPassword } from '../../lib/constants'

export default function Init() {
  const { t } = useTranslation()
  const { aspInfo } = useContext(AspContext)
  const { setInitInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const handleNewWallet = () => {
    const mnemonic = generateMnemonic(wordlist)
    const seed = mnemonicToSeedSync(mnemonic)
    const privateKey = deriveKeyFromSeed(seed)
    setInitInfo({ privateKey, password: defaultPassword, restoring: false })
    navigate(Pages.InitSuccess)
  }

  const handleOldWallet = () => navigate(Pages.InitRestore)

  return (
    <>
      <Content>
        <CenterScreen>
          <WalletNewIcon />
          <FlexCol centered gap='0'>
            <Text bigger>{t('arkadeWallet')}</Text>
          </FlexCol>
          <ErrorMessage error={error} text={t('arkServerUnreachable')} />
        </CenterScreen>
      </Content>
      <ButtonsOnBottom>
        <Button disabled={error} onClick={handleNewWallet} label={t('createWallet')} />
        <Button disabled={error} onClick={() => setShowOptions(true)} label={t('otherLoginOptions')} clear />
      </ButtonsOnBottom>
      <SheetModal isOpen={showOptions} onClose={() => setShowOptions(false)}>
        <FlexCol gap='1rem'>
          <Text>{t('otherLoginOptions')}</Text>
          <Button fancy disabled={error} onClick={handleOldWallet} label={t('restoreWallet')} secondary />
        </FlexCol>
      </SheetModal>
    </>
  )
}

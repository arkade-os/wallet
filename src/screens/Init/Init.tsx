import { useContext, useEffect, useState } from 'react'
import { generateMnemonic } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { AspContext } from '../../providers/asp'
import Error from '../../components/Error'
import { getPrivateKeyFromMnemonic } from '../../lib/wallet'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import CenterScreen from '../../components/CenterScreen'
import Text from '../../components/Text'
import LogoIcon from '../../icons/Logo'
import FlexCol from '../../components/FlexCol'
import { IframeContext } from '../../providers/iframe'
import Minimal from '../../components/Minimal'
import SheetModal from '../../components/SheetModal'

export default function Init() {
  const { aspInfo } = useContext(AspContext)
  const { setInitInfo } = useContext(FlowContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState(false)
  const [showOptions, setShowOptions] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const handleNewWallet = () => {
    const mnemonic = generateMnemonic(wordlist)
    getPrivateKeyFromMnemonic(mnemonic).then((privateKey) => {
      setInitInfo({ privateKey })
      navigate(Pages.InitPassword)
    })
  }

  const handleOldWallet = () => navigate(Pages.InitRestore)

  if (iframeUrl)
    return (
      <Minimal>
        <FlexCol gap='0'>
          <Text small>Initialize your wallet and then reload this page</Text>
        </FlexCol>
      </Minimal>
    )

  return (
    <>
      <Content>
        <CenterScreen>
          <LogoIcon big />
          <FlexCol centered gap='0'>
            <Text bigger>Arkade Wallet</Text>
          </FlexCol>
          <Error error={error} text='Ark server unreachable' />
        </CenterScreen>
      </Content>
      <ButtonsOnBottom>
        <Button disabled={error} onClick={handleNewWallet} label='+ Create wallet' />
        <Button disabled={error} onClick={() => setShowOptions(true)} label='Other login options' clear />
      </ButtonsOnBottom>
      <SheetModal isOpen={showOptions} onClose={() => setShowOptions(false)}>
        <FlexCol gap='1rem'>
          <Text>Other login options</Text>
          <Button fancy disabled={error} onClick={handleOldWallet} label='Restore wallet' secondary />
        </FlexCol>
      </SheetModal>
    </>
  )
}

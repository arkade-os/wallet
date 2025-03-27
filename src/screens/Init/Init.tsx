import { useContext, useEffect, useState } from 'react'
import { generateMnemonic, mnemonicToSeedSync } from '@scure/bip39'
import { wordlist } from '@scure/bip39/wordlists/english'
import Button from '../../components/Button'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { AspContext } from '../../providers/asp'
import Error from '../../components/Error'
import { FlowContext } from '../../providers/flow'
import Content from '../../components/Content'
import CenterScreen from '../../components/CenterScreen'
import Text from '../../components/Text'
import LogoIcon from '../../icons/Logo'
import FlexCol from '../../components/FlexCol'
import { IframeContext } from '../../providers/iframe'
import Minimal from '../../components/Minimal'

export default function Init() {
  const { aspInfo } = useContext(AspContext)
  const { setInitInfo } = useContext(FlowContext)
  const { iframeUrl } = useContext(IframeContext)
  const { navigate } = useContext(NavigationContext)

  const [error, setError] = useState(false)

  useEffect(() => {
    setError(aspInfo.unreachable)
  }, [aspInfo.unreachable])

  const handleNewWallet = () => {
    const mnemonic = generateMnemonic(wordlist)
    const seed = mnemonicToSeedSync(mnemonic)
    setInitInfo({ seed })
    navigate(Pages.InitPassword)
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
        <Button disabled={error} onClick={handleNewWallet} label='New wallet' />
        <Button disabled={error} onClick={handleOldWallet} label='Restore wallet' />
      </ButtonsOnBottom>
    </>
  )
}

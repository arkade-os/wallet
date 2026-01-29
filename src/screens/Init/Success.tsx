import { useContext } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Success from '../../components/Success'
import { FlowContext } from '../../providers/flow'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { ConfigContext } from '../../providers/config'

export default function InitSuccess() {
  const { t } = useTranslation()
  const { config } = useContext(ConfigContext)
  const { initInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)

  const headline = initInfo.restoring ? t('walletRestoredSuccessfully') : t('yourNewWalletIsLive')

  const text = initInfo.restoring
    ? config.nostrBackup
      ? t('walletRestoredWithNostrBackup')
      : t('walletRestoredReady')
    : t('walletCreatedReady')

  return (
    <>
      <Header text={t('createNewWallet')} />
      <Content>
        <Success headline={headline} text={text} />
      </Content>
      <ButtonsOnBottom>
        <Button onClick={() => navigate(Pages.InitConnect)} label={t('goToWallet')} />
      </ButtonsOnBottom>
    </>
  )
}

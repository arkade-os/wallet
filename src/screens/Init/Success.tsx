import { useContext } from 'react'
import Button from '../../components/Button'
import Header from '../../components/Header'
import Content from '../../components/Content'
import Success from '../../components/Success'
import { FlowContext } from '../../providers/flow'
import ButtonsOnBottom from '../../components/ButtonsOnBottom'
import { NavigationContext, Pages } from '../../providers/navigation'
import { ConfigContext } from '../../providers/config'
import { useTranslation } from '../../providers/language'

export default function InitSuccess() {
  const { config } = useContext(ConfigContext)
  const { initInfo } = useContext(FlowContext)
  const { navigate } = useContext(NavigationContext)
  const { t } = useTranslation()

  const headline = initInfo.restoring ? t('init.walletRestored') : t('init.newWalletLive')

  const text = initInfo.restoring
    ? config.nostrBackup
      ? t('init.restoreSuccessText')
      : t('init.restoreReadyText')
    : t('init.createReadyText')

  return (
    <>
      <Header text={t('init.createNewWallet')} />
      <Content>
        <Success headline={headline} text={text} />
      </Content>
      <ButtonsOnBottom>
        <Button onClick={() => navigate(Pages.InitConnect)} label={t('init.goToWallet')} />
      </ButtonsOnBottom>
    </>
  )
}

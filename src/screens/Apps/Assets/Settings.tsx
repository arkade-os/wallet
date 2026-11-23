import { useContext } from 'react'
import { BackupContext } from '@/providers/backup'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Toggle from '../../../components/Toggle'
import Button from '../../../components/Button'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { AspContext } from '../../../providers/asp'
import { ConfigContext } from '../../../providers/config'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { WalletContext } from '../../../providers/wallet'
import { useTranslation } from '../../../providers/language'

export default function AppAssetsSettings() {
  const { config } = useContext(ConfigContext)
  const { aspInfo } = useContext(AspContext)
  const { balance } = useContext(WalletContext)
  const { navigate } = useContext(NavigationContext)
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { t } = useTranslation()

  const toggleConnection = () => {
    const enabling = !config.apps.assets.enabled
    backupAndUpdateConfig({ ...config, apps: { ...config.apps, assets: { enabled: enabling } } })
  }

  return (
    <>
      <Header text={t('mint.settingsTitle')} back />
      <Content>
        <Padded>
          <FlexCol>
            <Toggle
              checked={config.apps.assets.enabled}
              onClick={toggleConnection}
              text={t('mint.enableArkadeMint')}
              subtext={t('mint.enableArkadeMintSubtext')}
              testId='assets-toggle'
            />
            {config.apps.assets.enabled ? (
              <Button
                label={t('mint.mint')}
                onClick={() => navigate(Pages.AppAssetMint)}
                disabled={balance < aspInfo.dust}
              />
            ) : null}
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}

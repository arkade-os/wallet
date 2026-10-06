import { useContext } from 'react'
import { BackupContext } from '@/providers/backup'
import Padded from '../../../components/Padded'
import Header from '../../../components/Header'
import Toggle from '../../../components/Toggle'
import Content from '../../../components/Content'
import FlexCol from '../../../components/FlexCol'
import { ConfigContext } from '../../../providers/config'
import { NavigationContext, Pages } from '../../../providers/navigation'
import { useTranslation } from '../../../providers/language'

export default function AppAssetsSettings() {
  const { config } = useContext(ConfigContext)
  const { replace } = useContext(NavigationContext)
  const { backupAndUpdateConfig } = useContext(BackupContext)
  const { t } = useTranslation()

  const toggleConnection = () => {
    const enabling = !config.apps.assets.enabled
    backupAndUpdateConfig({ ...config, apps: { ...config.apps, assets: { enabled: enabling } } })
    if (enabling) replace(Pages.AppAssets, [Pages.Settings])
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
          </FlexCol>
        </Padded>
      </Content>
    </>
  )
}

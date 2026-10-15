import { useContext, useState } from 'react'
import DismissibleBanner from '../../components/DismissibleBanner'
import ExternalLinkIcon from '../../icons/ExternalLink'
import { useIsMobile } from '../../hooks/use-mobile'
import { openInstalledApp } from '../../lib/appIntent'
import { pwaIsInstalled } from '../../lib/pwa'
import { FlowContext } from '../../providers/flow'
import { useTranslation } from '../../providers/language'

/** Shown when this tab is not the installed app. Safari cannot switch to it. Desktop has no app to open. */
export default function OpenInApp() {
  const { appIntent } = useContext(FlowContext)
  const { t } = useTranslation()
  const isMobile = useIsMobile()
  const [explain, setExplain] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  if (!isMobile || dismissed || !appIntent || appIntent.status === 'invalid' || pwaIsInstalled()) return null

  const open = () => {
    if (openInstalledApp(appIntent) === 'unavailable') setExplain(true)
  }

  return (
    <DismissibleBanner
      id='open-in-app'
      icon={<ExternalLinkIcon small />}
      title={t('appIntent.openInApp')}
      description={explain ? t('appIntent.openInAppSafari') : t('appIntent.openInAppHint')}
      descriptionTestId={explain ? 'app-intent-open-in-app-help' : undefined}
      action={{ label: t('appIntent.open'), onClick: open, testId: 'app-intent-open-in-app' }}
      onDismiss={() => setDismissed(true)}
      visible
    />
  )
}

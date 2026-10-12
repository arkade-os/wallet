import { useContext, useState } from 'react'
import Button from '../../components/Button'
import Text from '../../components/Text'
import { openInstalledApp } from '../../lib/appIntent'
import { pwaIsInstalled } from '../../lib/pwa'
import { FlowContext } from '../../providers/flow'
import { useTranslation } from '../../providers/language'

/** Shown when this tab is not the installed app. Safari cannot switch to it. */
export default function OpenInApp() {
  const { appIntent } = useContext(FlowContext)
  const { t } = useTranslation()
  const [explain, setExplain] = useState(false)

  if (!appIntent || appIntent.status === 'invalid' || pwaIsInstalled()) return null

  const open = () => {
    if (openInstalledApp(appIntent) === 'unavailable') setExplain(true)
  }

  return (
    <>
      <Button label={t('appIntent.openInApp')} onClick={open} secondary testId='app-intent-open-in-app' />
      {explain ? (
        <Text small wrap testId='app-intent-open-in-app-help'>
          {t('appIntent.openInAppSafari')}
        </Text>
      ) : null}
    </>
  )
}

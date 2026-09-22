import { useEffect } from 'react'
import { useTranslation } from '../providers/language'
import { getChatwootVars, getChatwootSettings, getChatwootLocale, injectAndRunChatwootScript } from '../lib/chatwoot'

const ChatwootWidget = () => {
  // The widget is a singleton: it is injected once, with the locale captured
  // at first render. Later language switches are pushed to the running widget
  // via setChatwootLocale in Support.tsx rather than re-injecting the script.
  const { language } = useTranslation()

  useEffect(() => {
    const vars = getChatwootVars()
    if (!vars.websiteToken || !vars.baseUrl) return

    // Set Chatwoot settings, including the widget UI locale
    window.chatwootSettings = getChatwootSettings(getChatwootLocale(language))

    // Chatwoot script injection logic
    injectAndRunChatwootScript(vars)

    // Cleanup function
    return () => {
      const scriptTag = document.querySelector(`script[src*="${vars.baseUrl}/packs/js/sdk.js"]`)
      if (scriptTag) scriptTag.remove()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null // Component does not render UI
}

export default ChatwootWidget
